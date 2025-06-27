export const handleError = (res, status, message, error = null) => {
  console.error(error || message);
  res.status(status).json({ status: false, message });
};
