# Sudoques

A modern, responsive Sudoku web application built with **Bun**, **React**, and **Tailwind CSS**. Not just another Sudoku clone, but a premium experience featuring a sleek glassmorphism design and smooth animations.

[**Live App**](https://sudoques.web.app)

## Features

-   **Classic Gameplay**: Enjoy the timeless puzzle game with a fresh look.
-   **Smart Highlighting**: 
    -   Select a number to highlight all its occurrences on the board.
    -   Row, column, and box highlighting for better focus.
-   **Visual Error Detection**:
    -   Mistakes pulse and glow red to alert you immediately.
    -   Conflicts are clearly marked with bold borders.
-   **Undo/Redo**: seamless history navigation with single-click undo actions.
-   **Note Mode**: pencil in candidates to solve complex puzzles.
-   **Difficulty Levels**: From Easy to Expert to challenge all skill levels.
-   **Timer & tracking**: Keep track of your solving time.
-   **Glassmorphism UI**: A beautiful, translucent interface that adapts to your device.
-   **Responsive Design**: optimized for both desktop and mobile play.

## Tech Stack

-   **Runtime**: [Bun](https://bun.sh) (v1.3.9+)
-   **Frontend**: React 19
-   **Styling**: Tailwind CSS v4, Framer Motion
-   **Backend/Hosting**: Firebase (Firestore, Auth, Hosting)
-   **Building**: Custom `build.ts` script using Bun's bundler

## Getting Started

### Prerequisites

-   [Bun](https://bun.sh) installed on your machine.
-   A Firebase project (optional, for deployment/persistence).

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/JenspederM/sudoques.git
cd sudoques
bun install
```

### Development

Start the development server with hot reloading:

```bash
bun dev
```

Visit `http://localhost:3000` (or the port shown in your terminal).

### Production Build

Create a production-ready build in the `dist` folder:

```bash
bun run build
# or
bun start
```

### Deployment

Deploy to Firebase Hosting:

```bash
bun run deploy
```
