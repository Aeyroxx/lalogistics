# L&A Logistics Services Portal

A comprehensive web application for monitoring inbound parcels, lost parcels, and computing earnings for a logistics company.

## Features

- **Employee Management**
  - Detailed employee profiles with personal information
  - Document uploads (ID cards, profile pictures)
  - Admin-only user management

- **Automated ID Card Generation**
  - Company logo and address
  - Employee details
  - QR code integration

- **Audit System**
  - Different computation rules for SPX and Flash Express couriers
  - Specialized pricing structure for each courier type
  - Daily, weekly, monthly, quarterly, and yearly reports

- **Lost Parcels Logger**
  - Tracking number management
  - QR code and barcode generation
  - Courier tracking

## Technology Stack

- **Backend**: Node.js, Express
- **Database**: MongoDB
- **Frontend**: EJS, CSS, JavaScript
- **Authentication**: JWT, Session-based auth
- **File Handling**: Multer
- **QR/Barcode**: QRCode.js, JsBarcode
- **PDF Generation**: html-pdf

## Installation

1. Clone the repository
```
git clone https://github.com/yourusername/lalogistics.git
cd lalogistics
```

2. Install dependencies
```
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/lalogistics
JWT_SECRET=your_jwt_secret_key_here
SESSION_SECRET=your_session_secret_key_here
NODE_ENV=development
```

4. Start the application
```
npm start
```

For development:
```
npm run dev
```

## Project Structure

```
lalogistics/
├── config/             # Configuration files
├── controllers/        # Route controllers
├── middleware/         # Custom middleware
├── models/             # Database models
├── public/             # Static files
│   ├── css/            # CSS files
│   ├── js/             # JavaScript files
│   ├── img/            # Image files
│   └── uploads/        # Uploaded files
├── routes/             # Route definitions
├── utils/              # Utility functions
├── views/              # EJS templates
│   └── partials/       # Reusable template parts
├── .env                # Environment variables
├── app.js              # Entry point
├── package.json        # Project manifest
└── README.md           # Project documentation
```

## Initial Setup

After installation, create an admin user by running the following in MongoDB shell or using a tool like MongoDB Compass:

```javascript
db.users.insertOne({
  employeeNumber: "ADMIN001",
  name: "Admin User",
  email: "admin@example.com",
  password: "$2a$10$XtW.BrkV5RkN6SaXzVEOPuXxxfSVZQQYIXZ1yHSEX.0oLEKrBWOxy", // "password123"
  role: "admin",
  createdAt: new Date()
})
```

This will create an admin user with:
- Email: admin@example.com
- Password: password123

## License

This project is proprietary and confidential. Unauthorized copying, transferring, or reproduction of the contents of this project, via any medium is strictly prohibited.

© 2025 L&A Logistics Services. All rights reserved.
