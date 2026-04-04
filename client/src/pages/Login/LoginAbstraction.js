/*
LoginAbstraction.js

Contains the logic for handling login requests.
NOTE: No actual authentication logic is implemented for the scope of this demo.
*/

export const loginAbstraction = async (credentials) => {
    const res = await fetch('/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
    });
    return res.json();
}