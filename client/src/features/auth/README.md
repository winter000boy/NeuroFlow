# Authentication System

This directory contains the authentication components and logic for the Workflow Automation Platform.

## Components

### Login.tsx

- Login form with email/password validation
- Handles authentication errors and loading states
- Redirects to intended page after successful login
- Uses React Hook Form with Zod validation

### Register.tsx

- Registration form with name, email, password, and confirm password
- Strong password validation requirements
- Handles registration errors and loading states
- Automatically logs in user after successful registration

## Features

### Form Validation

- Email format validation
- Password strength requirements (min 6 chars, uppercase, lowercase, number)
- Password confirmation matching
- Real-time validation feedback

### Authentication Flow

1. User submits login/registration form
2. Form validation occurs client-side
3. API request sent to backend
4. JWT tokens stored in localStorage
5. User redirected to dashboard or intended page

### Token Management

- Access tokens for API requests
- Refresh tokens for automatic token renewal
- Automatic token refresh on API 401 errors
- Token cleanup on logout

### Error Handling

- Network error handling
- Validation error display
- Authentication error messages
- Loading states during requests

## Usage

```tsx
import { useAuth } from '../../contexts/AuthContext';

const MyComponent = () => {
  const { user, isAuthenticated, login, logout } = useAuth();

  // Component logic here
};
```

## Security Features

- Secure token storage
- Automatic token refresh
- Protected routes
- Input validation and sanitization
- Error message sanitization
