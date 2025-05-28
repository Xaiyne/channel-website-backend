# Backend Server

## Environment Variables
Create a `.env` file in the root directory with the following variables:

```
PORT=443
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
FRONTEND_URL=https://statsflow.online
```

## Installation
```bash
npm install
```

## Running the Server
```bash
npm start
```

The server will run on https://api.statsflow.online:443

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