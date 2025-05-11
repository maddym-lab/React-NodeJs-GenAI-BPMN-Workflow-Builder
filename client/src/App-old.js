import logo from './logo.svg';
import {React, useState, useEffect} from 'react';
import './App.css';

function App() {
  const [ response, setReponse ] = useState('');

  useEffect(() => {
    /*
    fetch('http://localhost:3001/testapi' , { mode: 'cors' })
        .then(res => res.text())
        .then(res => setReponse(res)
        );
        */
    fetch('http://localhost:3001/testapi')
        .then(res => res.text())
        .then(res => setReponse(res)
        );
  })

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
        <p className="App-intro">{response}</p>
      </header>
    </div>
  );
}

export default App;
