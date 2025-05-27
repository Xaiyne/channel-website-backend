# Channel Website Backend

Backend server for the Channel Website application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with the following variables:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/your_database
JWT_SECRET=your_secret_key
CORS_ORIGIN=https://your-netlify-app.netlify.app
```

3. Start the server:
```bash
npm start
```

## Development

- `npm run dev` - Start development server with hot reload
- `npm test` - Run tests
- `npm run lint` - Run linter

## API Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/subscriptions/create` - Create subscription
- `GET /api/subscriptions/status` - Check subscription status

## Security

This application implements various security measures:
- JWT authentication
- Rate limiting
- CORS protection
- XSS prevention
- SQL injection protection

## License

MIT License - see LICENSE file for details 