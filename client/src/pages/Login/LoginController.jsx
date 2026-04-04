/*
LoginController.jsx

Mediates between the LoginPresentation and the LoginAbstraction, handling any communication between agents of the two components.
NOTE: No actual authentication logic is implemented for the scope of this demo.
*/

import { useState } from 'react';

import { loginAbstraction } from './LoginAbstraction.js';
import LoginPresentation from './LoginPresentation.jsx';

export default function LoginController({ onLoginSuccess }) {
    const [error, setError] = useState(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await loginAbstraction({ email, password });
            if (res.success) {
                console.log("res.success happened");
                onLoginSuccess();
                // Handle successful login, e.g., redirect or store token
                // For demo purposes, we'll just redirect to the home page
            } else {
                console.log("ruh roh raggy");
                setError(res.message || 'Login failed');
            }
        } catch (err) {
            setError('An error occurred during login');
        }
    }

    return (
        <LoginPresentation
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            handleLogin={handleLogin}
            error={error}
        />
    );
}