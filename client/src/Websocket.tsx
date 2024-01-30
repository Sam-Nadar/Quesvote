import React, { useState, useEffect } from 'react';
// import { useWebSocket } from './WebSocketContext';

interface Question {
  _id: string;
  question: string;
  vote: number;
  voted: boolean;
}

const WebSocketComponent: React.FC = () => {
  const socket = new WebSocket('ws://localhost:3000/');
  
  const [userQuestion, setUserQuestion] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  

  useEffect(() => {
    if (!socket) return;

    // Handle incoming messages
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received data:', data);

      if (data.type === 'question') {
        
        // Check if the question is already in the state to avoid duplicates
        // const questionExists = questions.some((q) => q._id === data.payload.question._id);
        // console.log('Question exists:', questionExists);

        // if (!questionExists) {
          // Update state with new question
          setQuestions((prevQuestions) => [...prevQuestions, data.payload.question]);
        
      } else if (data.type === 'vote') {
        // Update vote count in state
        const updatedQuestions = questions.map((q) => {
          if (q._id === data.payload.questionId) {
            return { ...q, vote: data.payload.updatedVote };
          }
          return q;
        });

        // Rearrange questions based on votes
        updatedQuestions.sort((a, b) => b.vote - a.vote);
        console.log('Updated questions:', updatedQuestions);

        // Update state with rearranged questions
        setQuestions(updatedQuestions);
      }
    };

    socket.onopen = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const roomId = urlParams.get('roomId');
      socket.send(
        JSON.stringify({
          type: 'join',
          payload: {
            roomId: roomId,
          },
        })
      );
    };

    
      // No need to close the socket here, it will be managed by the WebSocketContext
      return () => {
        console.log('Cleaning up WebSocket...');
        // Check if the socket is open before closing
        if (socket.readyState === WebSocket.OPEN) {
          socket.close();
        }
      };
    
  }, [socket, questions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserQuestion(e.target.value);
  };

  const handleQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (socket && userQuestion.trim() !== '') {
      // Send the user's question to the server
      socket.send(
        JSON.stringify({
          type: 'question',
          payload: {
            question: userQuestion,
          },
        })
      );

      // Clear the input
      setUserQuestion('');
    }
  };

  const handleVoteClick = (questionId: string) => {
    if (socket ) {
      // Send the vote to the server
      socket.send(
        JSON.stringify({
          type: 'vote',
          payload: {
            questionId: questionId,
          },
        })
      );

      // Set voteClicked to true to disable the vote button
      setQuestions((prevQuestions) =>
      prevQuestions.map((q) =>
        q._id === questionId ? { ...q, vote: q.vote + 1, voted: true } : q
      )
    );
  }
};
    
  return (
    <div>
      {/* User input for question */}
      <form onSubmit={handleQuestionSubmit}>
        <input
          type="text"
          value={userQuestion}
          onChange={handleInputChange}
          placeholder="Enter your question"
        />
        <button type="submit">Submit Question</button>
      </form>
      {/* Display questions */}
      <div>
        {questions.map((question) => (
          <div key={question._id}>
            <p>{question.question}</p>
            <p>Votes: {question.vote}</p>
            {!question.voted && (
              <button onClick={() => handleVoteClick(question._id)}>Vote</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WebSocketComponent;
