const express = require("express");
const {
  register,
  verify,
  login,
  logout,
  addTask,
  removeTask,
  updateTask,
  getMyProfile,
  updateProfile,
  updatePassword,
  forgetPassword,
  resetPassword,
} = require("../controllers/User");
const { isAuthenticated } = require("../middlewares/isAuthenticated");
const router = express.Router();

router.post("/register", register);
router.post("/verify", isAuthenticated, verify);
router.post("/login", login);
router.get("/logout", logout);
router.post("/newtask", isAuthenticated, addTask);
router.delete("/task/:taskId", isAuthenticated, removeTask);
router.get("/task/:taskId", isAuthenticated, updateTask);
router.get("/me", isAuthenticated, getMyProfile);
router.put("/updateprofile", isAuthenticated, updateProfile);
router.put("/updatepassword", isAuthenticated, updatePassword);
router.post("/forgetpassword", forgetPassword);
router.put("/resetpassword", resetPassword);

module.exports = router;
