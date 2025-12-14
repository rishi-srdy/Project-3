# Santa’s Workshop Puzzle – Project 3

## Student
Name: Rishikesh Sangareddypeta  
Course: CSC 4370 / 6370  
Project: Christmas Fifteen Puzzle  

## Features Implemented
- 3x3 and 4x4 sliding puzzle
- Click-to-move tiles (adjacent only)
- Move counter
- Timer
- Win detection
- Login / Register
- Session tracking
- Leaderboard by puzzle size
- Responsive UI
- Christmas-themed UI (red, white, green)
- Snow animation

## How to Run
1. Import database:
   mysql -u root < backend/db/schema.sql
2. Start PHP server:
   php -S localhost:8000
3. Open:
   http://localhost:8000/frontend/index.html

## Notes
- Leaderboard updates per puzzle size
- First move starts timer
- Puzzle resets correctly on size change