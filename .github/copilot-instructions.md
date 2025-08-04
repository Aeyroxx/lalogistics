# L&A Logistics Services Portal

## Architecture Overview
Node.js Express app with MongoDB, using session + JWT hybrid auth. MVC pattern with:
- **Controllers**: Business logic (`controllers/`)
- **Models**: Mongoose schemas with pre-save hooks for calculations (`models/`)
- **Views**: EJS templates with shared layout (`views/`)
- **Routes**: Express routes mapped to controllers (`routes/`)
- **Middleware**: Auth, file uploads, validation (`middleware/`)

## Key Business Logic Patterns

### Audit System with Courier-Specific Calculations
- **SPX Audit** (`models/SpxAudit.js`): Pre-save hook calculates earnings based on 100-parcel cap, base rate (₱0.50), bonus for SLA compliance, minus penalties
- **Flash Express** (`models/FlashExpressAudit.js`): Simple ₱3.00 per parcel, 30-parcel max per seller
- Both use `calculatedEarnings` field populated automatically on save

### Role-Based Access Control
- **Admin vs Employee**: Check `req.user.role === 'admin'` throughout controllers
- **Self-access**: Users can edit own profiles via `req.user._id.toString() === req.params.id`
- **View-level protection**: EJS templates use `<% if (user.role === 'admin') { %>`

### User/Employee Creation Requirements
- **Employee Number**: Auto-generated using pattern `LA(YEAR)-MONTH(timestamp)` (e.g., LA2025-082595)
- **Validation**: Check email uniqueness (employeeNumber is auto-generated)
- **Profile Creation**: EmployeeProfile created with placeholder values during User creation
- **ID Card Requirements**: EmployeeProfile must exist for ID card generation to work

### File Upload Structure
- **Profile pics**: `public/uploads/profile/` with pattern `{userId}-{timestamp}.ext`
- **ID cards**: `public/uploads/ids/` with pattern `{userId}-{fieldname}-{timestamp}.ext`
- **QR codes**: `public/uploads/` for lost parcels
- Multer configured in `middleware/uploadMiddleware.js` with 5MB limits

## Development Workflows

### Running the Application
```bash
npm run dev  # Development with nodemon
npm start    # Production
```

### Database Setup
- MongoDB connection via `MONGODB_URI` env var
- Create admin user with `utils/seedAdmin.js` or manual insertion
- Session storage in MongoDB via `connect-mongo`

## UI/UX Conventions

### CSS Theme System
- CSS custom properties in `public/css/style.css`:
  - `--primary-color: #4361ee` (main brand)
  - `--border-radius-sm: 8px` (consistent rounded corners)
- Sidebar navigation with Font Awesome icons
- Bootstrap 5 + custom overlay for modern look

### EJS Template Patterns
- **Layout inheritance**: All views extend `views/layout.ejs`
- **Global variables**: `res.locals.user` and `res.locals.path` set in middleware
- **Partials**: Reusable components in `views/partials/`
- **Active navigation**: Use `path === '/route' ? 'active' : ''` pattern

## Data Flow Patterns

### Authentication Flow
1. Session-first: Check `req.session.user`
2. JWT fallback: Check `req.cookies.token` or `Authorization` header
3. Set `req.user` and `res.locals.user` for templates

### Error Handling
- Render `error.ejs` template with `message` and `error` objects
- Console.error for server-side logging
- Status codes with appropriate error pages

## Key Dependencies & Integration Points
- **QR/Barcode**: `qrcode` package for parcel tracking
- **PDF Generation**: `html-pdf` for reports and ID cards
- **File Processing**: `multer` with disk storage
- **Date Handling**: `moment.js` for audit date ranges
- **Password Hashing**: `bcryptjs` in auth controllers
