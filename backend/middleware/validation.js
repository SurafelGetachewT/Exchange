const { body, validationResult } = require('express-validator');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// User registration validation
const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('username')
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-30 characters, alphanumeric and underscore only'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, number and special character'),
  body('firstName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be 1-50 characters'),
  body('lastName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be 1-50 characters'),
  body('phone')
    .optional()
    .matches(/^[+]?[\d\s-()]+$/)
    .withMessage('Invalid phone number format'),
  handleValidationErrors
];

// User login validation
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Password change validation
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must be at least 8 characters with uppercase, lowercase, number and special character'),
  handleValidationErrors
];

// Order creation validation
const validateOrder = [
  body('type')
    .isIn(['MARKET', 'LIMIT', 'STOP'])
    .withMessage('Order type must be MARKET, LIMIT, or STOP'),
  body('side')
    .isIn(['BUY', 'SELL'])
    .withMessage('Order side must be BUY or SELL'),
  body('symbol')
    .matches(/^[A-Z]+USDT$/)
    .withMessage('Symbol must end with USDT (e.g., BTCUSDT)'),
  body('amount')
    .isFloat({ min: 0.00000001 })
    .withMessage('Amount must be greater than 0'),
  body('price')
    .if(body('type').not().equals('MARKET'))
    .isFloat({ min: 0.00000001 })
    .withMessage('Price is required for non-market orders and must be greater than 0'),
  handleValidationErrors
];

module.exports = {
  validateRegistration,
  validateLogin,
  validatePasswordChange,
  validateOrder,
  handleValidationErrors
};
