# Atoms Voice/Text Chat Frontend Demo

This is a simple React + TypeScript demo app that lets you connect to an Atoms agent for either voice (webcall) or text chat. It uses the [`atoms-client-sdk`](https://www.npmjs.com/package/atoms-client-sdk) for all client-side communication.

## Features

- Toggle between voice and text chat modes
- Real-time agent connection status
- Message history and auto-scrolling
- Mute/unmute for voice calls
- Error handling and status display

## Getting Started

1. **Install dependencies:**

   ```bash
   cd front-end-demo
   npm install
   ```

2. **Configure your agent ID:**

   Edit `src/App.tsx` and set your `agentId` (or pass as a prop).

3. **Start the backend (for local API proxy):**

   ```bash
   cd ../example_backend
   npm install
   npm run dev
   ```

   > The backend is a simple Express server that proxies requests to the Atoms API.  
   > **You must set your API key** in `example_backend/index.js`!

4. **Start the frontend:**

   ```bash
   cd ../front-end-demo
   npm run dev
   ```

5. **Open [http://localhost:5173](http://localhost:5173) in your browser.**

## More Info

- For SDK usage and API details, refer to:  
  https://www.npmjs.com/package/atoms-client-sdk

- This demo uses [Vite](https://vitejs.dev/) and [Tailwind CSS](https://tailwindcss.com/).

## License

MIT
