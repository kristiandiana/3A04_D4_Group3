/*
LoginController.jsx

Mediates between the LoginPresentation and the LoginAbstraction, handling any communication between agents of the two components.
NOTE: No actual authentication logic is implemented for the scope of this demo.
*/

import { useState } from 'react';

import { loginAbstraction } from './LoginAbstraction.js';
import LoginPresentation from './LoginPresentation.jsx';

export default function LoginController({ onLoginSuccess, onGoToSignup }) {
    const [error, setError] = useState(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await loginAbstraction({ email, password });
            if (res.success) {
                onLoginSuccess({ token: res.token, user: res.user });
            } else {
                setError(res.message || 'Login failed');
            }
        } catch {
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
            onGoToSignup={onGoToSignup}
        />
    );
}
