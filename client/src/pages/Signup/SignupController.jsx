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
    const [phoneNum, setPhoneNum] = useState('');

    const handleSignup = async (e) => {
        e.preventDefault();
        try {
            const res = await signupAbstraction({ email, password, name, phoneNum });
            if (res.success) {
                console.log("res.success happened");
                onSignupSuccess();
                // Handle successful signup, e.g., redirect or store token
                // For demo purposes, we'll just redirect to the home page
            } else {
                console.log("ruh roh raggy");
                setError(res.message || 'Signup failed');
            }
        } catch (err) {
            console.log(err);
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
            phoneNum={phoneNum}
            setPhoneNum={setPhoneNum}
            handleSignup={handleSignup}
            error={error}
            onGoToLogin={onGoToLogin}
        />
    );
}