const errorHandler = (err, req, res, next) => {
  // Default status
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  // Default error message
  let message = 'Server Error';
  
  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    message = Object.values(err.errors).map(val => val.message).join(', ');
    return res.status(400).json({
      success: false,
      error: message
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    message = `Duplicate field value: ${Object.keys(err.keyValue).join(', ')}`;
    return res.status(400).json({
      success: false,
      error: message
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
  
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
