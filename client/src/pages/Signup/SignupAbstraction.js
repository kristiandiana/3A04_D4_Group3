/*
SignupAbstraction.js

Contains the logic for handling signup requests.
NOTE: No actual authentication logic is implemented for the scope of this demo.
*/

export const signupAbstraction = async (credentials) => {
    const res = await fetch('/signup', {
        method: 'POST',
        body: JSON.stringify(credentials),
    });
    return res.json();
}