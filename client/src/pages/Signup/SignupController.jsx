/*
SignupController.jsx

Mediates between the SignupPresentation and the SignupAbstraction, handling any communication between agents of the two components.
NOTE: No actual authentication logic is implemented for the scope of this demo.
*/

import { useState } from 'react';

import { signupAbstraction } from './SignupAbstraction.js';
import SignupPresentation from './SignupPresentation.jsx';

export default function SignupController({ onSignupSuccess, onGoToLogin }) {
    const [error, setError] = useState(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSignup = async (e) => {
        e.preventDefault();
        try {
            const res = await signupAbstraction({ email, password, name });
            if (res.success) {
                onSignupSuccess({ token: res.token, user: res.user });
            } else {
                setError(res.message || 'Signup failed');
            }
        } catch {
            setError('An error occurred during signup');
        }
    }

    return (
        <SignupPresentation
            name={name}
            setName={setName}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            handleSignup={handleSignup}
            error={error}
            onGoToLogin={onGoToLogin}
        />
    );
}
