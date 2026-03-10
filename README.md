# DisClone

A Discord-like chat app with servers, channels, friends, and DMs. Built with vanilla HTML/CSS/JS and Firebase.

## Features

- Login & signup with email/password
- Create and join servers
- Text channels within servers
- Real-time messaging
- Add friends by username
- Direct messages with friends
- Dark theme UI inspired by Discord

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript (no frameworks)
- **Backend**: Firebase Auth + Cloud Firestore
- **Hosting**: GitHub Pages

## Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Email/Password** authentication (Build → Authentication → Email/Password)
3. Create a **Cloud Firestore** database in test mode (Build → Firestore Database)
4. Copy your Firebase config into `js/firebase-config.js`

## Deploy to GitHub Pages

1. Create a new repository on GitHub called `snapsnap`
2. Push this code to the repo
3. Go to Settings → Pages → set source to **main** branch
4. Your site will be live at `https://yourusername.github.io/snapsnap`

## How to Use

- **Create a server**: Click the `+` button in the server list
- **Join a server**: Enter a server ID in the join modal
- **Invite friends**: Share your server ID (click it to copy)
- **Add friends**: Go to Friends → Add Friend → enter their username
- **DM a friend**: Click the 💬 button next to their name
