import jwt from "jsonwebtoken";

export function authMiddleware(req, res, next) {
  //  get token from cookie
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: "Access denied, no token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}
