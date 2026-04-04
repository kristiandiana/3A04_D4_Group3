/*
LoginPresentation.jsx

Contains the UI for the login page.
NOTE: No actual authentication logic is implemented for the scope of this demo.
*/

export default function LoginPresentation({ email, setEmail, password, setPassword, handleLogin, error }) {
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
      <a href="">Don't have an account? Sign Up</a>
      <div>
        <h3>Support:</h3>
        <p>E-mail: <a href="mailto:scemasinquiries@gmail.com">scemasinquiries@gmail.com</a></p>
        <p>Phone: 1-555-555-5555</p>
        <h5>Hours of Operation</h5>
        <ul>
          <li>Monday-Friday: 9:00 AM - 5:00 PM</li>
          <li>Saturday: 10:00 AM - 2:00 PM</li>
          <li>Sunday: Closed</li>
        </ul>
      </div>
    </div> 
  );
}
