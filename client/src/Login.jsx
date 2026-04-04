import { useNavigate } from "react-router-dom";
import App from './App.jsx'

function Login() {
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();
        navigate('/', {state: {message: "Successfully logged in!"}});
    }

    return (
        <form action="" onSubmit={handleLogin}>
        <div>
            <label htmlFor="username">Username:</label>
            <input type="text" required/>
        </div>
        <div>
            <label htmlFor="password">Password:</label>
            <input type="password" />
        </div>
        <div>
            <button type="submit">Log In</button>
        </div>
    </form>
    ); 
}

export default Login;