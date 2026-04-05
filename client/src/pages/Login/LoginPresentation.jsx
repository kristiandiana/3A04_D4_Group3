/*
LoginPresentation.jsx

Contains the UI for the login page.
NOTE: No actual authentication logic is implemented for the scope of this demo.
*/

import SupportPresentation from "../SupportPresentation.jsx"

export default function LoginPresentation({ email, setEmail, password, setPassword, handleLogin, error, onGoToSignup }) {
  return (
    <div>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Login</button>
      </form>
      {error && <p>{error}</p>}
      <a href="#" onClick={(e) => {
          e.preventDefault();
          onGoToSignup();
        }}>
        Don't have an account? Sign Up
      </a>
      <SupportPresentation />
    </div> 
  );
}
