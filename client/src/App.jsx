import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route, Link, useLocation} from "react-router-dom";
import Login from './Login.jsx';


function Home() {
  const location = useLocation();
  const successMsg = location.state?.message;
  return (
    <>
      <div>
        {successMsg && (
          <div className="success">
            {successMsg}
          </div>
        )}
      </div>
      
      <p>SFWRENG 3A04 Deliverable 4</p>
        <ul>
          <li>Angad Chhabra</li>
          <li>Jerry Jing</li>
          <li>Danyal Yousuf</li>
          <li>Kristian Diana</li>
        </ul>
        <Link to="/login">
          <button>Log In</button>
        </Link>
        
        <button>Sign Up</button>
    </>
  );
}

function App() {
  return (
    <Router>
      <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
          </Routes>
      </main>
    </Router>
  );
}

export default App;
