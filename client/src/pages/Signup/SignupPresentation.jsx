/*
SignupPresentation.jsx

Contains the UI for the signup page.
NOTE: No actual authentication logic is implemented for the scope of this demo.
*/

import SupportPresentation from "../SupportPresentation.jsx"

export default function SignupPresentation({name, setName, email, setEmail, password, setPassword, phoneNum, setPhoneNum, handleSignup, error, onGoToLogin}) {
    return (
        <div>
            <form onSubmit={handleSignup}>
                <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                />
                <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                />
                <input
                type="tel"
                placeholder="Phone Number"
                value={phoneNum}
                onChange={(e) => setPhoneNum(e.target.value)}
                />
                <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                />
                <button type="submit">Sign Up</button>
                {error ? <p role="alert">{error}</p> : null}
            </form>
            <a href="#" onClick={(e) => {
                e.preventDefault();
                onGoToLogin();
                }}>
                Already have an account? Login
            </a>
            <SupportPresentation />
    </div> 
    )
}