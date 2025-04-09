import React, { useState, useRef, useEffect } from 'react';
import './play.css';
import { GameEvent, GameNotifier } from './game';

export function Play({ userName, setScores }) {
  const initialPositions = {
    green: { x: 10, y: 100 },
    red: { x: 10, y: 220 },
    blue: { x: 10, y: 340 },
    purple: { x: 10, y: 460 },
    orange: { x: 10, y: 580 },
  };

  const [dragPositions, setDragPositions] = useState({ ...initialPositions });
  const [isDragging, setIsDragging] = useState(false);
  const [draggedElement, setDraggedElement] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [inputValues, setInputValues] = useState({
    green: '',
    red: '',
    blue: '',
    purple: '',
    orange: '',
  });

  const [cutMessage, setCutMessage] = useState('');
  const [ronQuote, setRonQuote] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [peerMessages, setPeerMessages] = useState([]);

  const elementRefs = {
    green: useRef(null),
    red: useRef(null),
    blue: useRef(null),
    purple: useRef(null),
    orange: useRef(null),
  };

  const cutRef = useRef(null);
  const socketRef = useRef(null); 

  const fetchRonQuote = async () => {
    try {
      const response = await fetch('https://ron-swanson-quotes.herokuapp.com/v2/quotes');
      if (!response.ok) {
        throw new Error(`Error fetching quote: ${response.statusText}`);
      }
      const data = await response.json();
      setRonQuote(data[0] || 'No quote available.');
    } catch (error) {
      console.error('Error fetching quote:', error);
      setErrorMessage(`Failed to load quote: ${error.message}`);
      setRonQuote('');
    }
  };

  useEffect(() => {
    const protocol = window.location.protocol === 'http:' ? 'ws' : 'wss';
    const socket = new WebSocket(`${protocol}://${window.location.hostname}:8080/ws`);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('WebSocket connected');
    };

    socket.onmessage = (event) => {
      const message = event.data;
      setPeerMessages((prevMessages) => [...prevMessages, message]);
    };

    socket.onclose = () => {
      console.log('WebSocket disconnected');
    };

    return () => {
      socket.close();
    };
  }, []);

  const handleMouseDown = (e, color) => {
    setIsDragging(true);
    setDraggedElement(color);

    const element = elementRefs[color].current;
    setOffset({
      x: e.clientX - element.getBoundingClientRect().left,
      y: e.clientY - element.getBoundingClientRect().top,
    });
  };

  const handleMouseMove = (e) => {
    if (isDragging && draggedElement) {
      setDragPositions((prevPositions) => ({
        ...prevPositions,
        [draggedElement]: {
          x: e.clientX - offset.x,
          y: e.clientY - offset.y,
        },
      }));

      if (cutRef.current) {
        const cutRect = cutRef.current.getBoundingClientRect();
        const isOverCutArea =
          e.clientX >= cutRect.left &&
          e.clientX <= cutRect.right &&
          e.clientY >= cutRect.top &&
          e.clientY <= cutRect.bottom;

        if (isOverCutArea) {
          setCutMessage(inputValues[draggedElement]);
        } else {
          setCutMessage('');
        }
      }
    }
  };

  const handleMouseUp = () => {
    if (isDragging && draggedElement) {
      setDragPositions((prevPositions) => ({
        ...prevPositions,
        [draggedElement]: initialPositions[draggedElement],
      }));

      setIsDragging(false);
      setDraggedElement(null);

      if (cutMessage) {
        setScores((prevScores) => ({
          ...prevScores,
          [draggedElement]: cutMessage,
        }));

        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(cutMessage);
        }
      }
    }
  };

  const handleInputChange = (e, color) => {
    setInputValues((prev) => ({
      ...prev,
      [color]: e.target.value,
    }));
  };

  const handleNewQuote = () => {
    fetchRonQuote();
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, cutMessage]);

  return (
    <main>
      <div className="place-2">
        {/* Draggable color elements */}
        {Object.keys(inputValues).map((color) => (
          <div
            key={color}
            ref={elementRefs[color]}
            className={`c_${color}`}
            onMouseDown={(e) => handleMouseDown(e, color)}
            style={{
              top: `${dragPositions[color]?.y}px`,
              left: `${dragPositions[color]?.x}px`,
              position: 'absolute',
              cursor: 'move',
            }}
          >
            <input
              className={`m_${color}`}
              type="text"
              value={inputValues[color]}
              onChange={(e) => handleInputChange(e, color)}
              placeholder={`${color} Message`}
            />
          </div>
        ))}

        {/* Static "Cut Here" Section */}
        <div className="cutter" ref={cutRef}>
          <h1 className="cut-here">Cut Here</h1>
          <div className="cut-message">
            <input type="text" value={cutMessage} placeholder="Display message" readOnly />
          </div>
        </div>
      </div>

      {/* Display peer messages on the right side */}
      <div className="peer-messages">
        <h1 className="peer-quotes">Peer Messages</h1>
        {peerMessages.length > 0 ? (
          <div>
            {peerMessages.map((message, index) => (
              <div key={index} className="peer-message">
                <input type="text" value={message} readOnly />
              </div>
            ))}
          </div>
        ) : (
          <input type="text" />
        )}
      </div>

      {/* Display Ron Swanson Quote */}
      <div className="grid-3">
        <h1 className="quote">Ron Swanson Quote</h1>
        <div className="quote-display">
          {errorMessage ? (
            <p style={{ color: 'red' }}>{errorMessage}</p>
          ) : (
            <input
              type="text"
              value={ronQuote || 'Loading quote...'}
              readOnly
              className="quote-input"
            />
          )}
        </div>
        <button onClick={handleNewQuote} className="generate-quote-btn">
          Get New Quote
        </button>
      </div>
    </main>
  );
}
