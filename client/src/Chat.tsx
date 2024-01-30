import { useEffect, useState, useRef } from "react";
import { ChevronUp } from 'lucide-react';

interface Message {
  questionId: number; // Add a unique identifier for each question
  vote: number;
  room: string;
  username: string;
  question: string;
  time: string;
}

interface ChatProps {
  socket: WebSocket;
  username: string;
  room: string;
}

function Chat({ socket, username, room }: ChatProps) {
  const [currentQuestion, setcurrentQuestion] = useState("");
  const [questionList, setquestionList] = useState<Message[]>([]);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  const sendMessage = async () => {
    if (currentQuestion !== "") {
      const messageData: Message = {
        questionId: Date.now(), // Generate a unique identifier for the question
        vote: 0,
        room: room,
        username: username,
        question: currentQuestion,
        time: new Date(Date.now()).getHours() +
          ":" +
          new Date(Date.now()).getMinutes(),
      };

      await socket.send(
        JSON.stringify({
          type: 'question',
          payload: messageData,
        })
      );

      setcurrentQuestion("");
    }
  };

  const sendVote = (questionId: number) => {
    console.log(questionId);
    // Send the vote to the server
    socket.send(
      JSON.stringify({
        type: 'vote',
        payload: {
          questionId: questionId,
        },
      })
    );
  
    setquestionList((prevQuestions) => {
        if (Array.isArray(prevQuestions)) {
          const updatedQuestions = prevQuestions.map((q) =>
            q.questionId === questionId ? { ...q, vote: q.vote + 1 } : q
          );
      
          const sortedQuestions = [...updatedQuestions].sort((a, b) => b.vote - a.vote);
          return sortedQuestions;
        }
        return prevQuestions; // Return the original state if it's not an array
      });
      
  };
  
  const sendReqHistory = ()=>{
    socket.send(
        JSON.stringify({
          type: 'requesthistory',
          payload: {
          },
        })
      );

  }
  

  useEffect(() => {
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'question') {
        setquestionList((prevQuestions) => {
          const updatedQuestions = [...prevQuestions, data.payload];
          return updatedQuestions;
        });

        if (lastMessageRef.current) {
          lastMessageRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      } else if (data.type === 'history') {
        setquestionList([]);
        // If the server sends a history, update the questionList with the received history
        setquestionList(data.payload.questions);
      } else if (data.type === 'vote'){
        const updatedVote = data.payload.updatedVote;
        const questionId = data.payload.questionId;
  
        setquestionList((prevQuestions) => {
          const updatedQuestions = prevQuestions.map((q) =>
            q.questionId === questionId ? { ...q, vote: updatedVote } : q
          );
  
          // Sort the questions based on the updated vote count
          const sortedQuestions = [...updatedQuestions].sort((a, b) => b.vote - a.vote);
          return sortedQuestions;
        });
      }
    };
  }, [socket]);

  return (
    <div className="chat-window">
      <div className="chat-header">
        <p>Live Chat</p>
      </div>
      <div className="chat-body">
        <div className="message-container">
          {Array.isArray(questionList) && questionList.map((messageContent) => (
            <div
              key={messageContent.questionId}
              className="message"
              id={username === messageContent.username ? "you" : "other"}
              ref={messageContent.questionId === questionList[questionList.length - 1].questionId ? lastMessageRef : null}
            >
              <div>
                <div className="message-content">
                  <p>{messageContent.question}</p>
                </div>
                <div className="message-meta">
                  <p id="time">{messageContent.time}</p>
                  <p id="author">{messageContent.username}</p>
                </div>
              </div>
              <span style={{marginLeft: 140, marginTop: 20}}>{messageContent.vote}</span>
              <button
                className="buttonChe"
                style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer'}}
                onClick={() => sendVote(messageContent.questionId)}
              >
                <ChevronUp />
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="chat-footer">
        <input
          type="text"
          value={currentQuestion}
          placeholder="Hey..."
          onChange={(event) => {
            setcurrentQuestion(event.target.value);
          }}
        />
        <button onClick={sendMessage}>&#9658;</button>
      </div>

      <div>
        <button id = "reqbutton" onClick={sendReqHistory}>Request History</button>
        
      </div>
    </div>
  );
}

export default Chat;
