import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import { z } from "zod";
import cors from "cors";

const app = express();
const port = 3000;

app.use(cors());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const users: { [key: string]: { room: string; username: string; ws: any } } = {};
const questions: { [key: string]: { question: string; vote: number; roomId: string; username: string, time: string } } = {};

const questionInput = z.object({});

let counter = 0;

wss.on("connection", async (ws, req) => {
    const wsId = counter++;

    ws.on("message", async (message: string) => {
        const data = JSON.parse(message.toString());

        if (data.type === "join") {
            users[wsId] = {
                room: data.payload.roomId,
                username: data.payload.username,
                ws,
            };
        } else if (data.type === "question") {
            const roomId = users[wsId].room;
            const username = users[wsId].username;
            const question = data.payload.question;
            const vote = 0;

            // Use the correct properties to get the question data
            if (question) {
                const newQuestionId = counter++;
                questions[newQuestionId] = {
                    question: question,
                    vote,
                    roomId,
                    username,
                    time: data.payload.time, // Use the time property from the payload
                };

                // Notify all users in the same room about the new question
                Object.keys(users).forEach((userWsId) => {
                    if (users[userWsId].room === roomId) {
                        users[userWsId].ws.send(
                            JSON.stringify({
                                type: "question",
                                payload: {
                                    question: questions[newQuestionId].question,
                                    questionId: newQuestionId,
                                    vote: questions[newQuestionId].vote,
                                    username: questions[newQuestionId].username,
                                    time: questions[newQuestionId].time
                                },
                            })
                        );
                    }
                });
            }
        } else if (data.type === "requesthistory") {
            const roomId = users[wsId].room;

            const historyQuestions = Object.values(questions).filter((q) => q.roomId === roomId);
            const sortedQuestions = [...historyQuestions].sort((a, b) => b.vote - a.vote);
            users[wsId].ws.send(
                JSON.stringify({
                    type: "history",
                    payload: {
                        questions: sortedQuestions,
                    },
                })
            );
        } else if (data.type === "vote") {
            const roomId = users[wsId].room;
            const questionId = data.payload.questionId;

            // Update the vote count for the question in memory
            if (questions[questionId]) {
                questions[questionId].vote += 1;

                // Notify all users in the same room about the updated vote count
                Object.keys(users).forEach((userWsId) => {
                    if (users[userWsId].room === roomId) {
                        users[userWsId].ws.send(
                            JSON.stringify({
                                type: "vote",
                                payload: {
                                    questionId: questionId,
                                    updatedVote: questions[questionId].vote,
                                },
                            })
                        );
                    }
                });
            } else {
                console.log("Question not found");
            }
        } else {
            console.log("Invalid message type");
        }
    });
});

server.listen(port, () => {
    console.log("Server listening on port " + port);
});
