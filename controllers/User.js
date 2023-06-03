const User = require("../models/User");
const nodemailer = require("nodemailer");
const cloudinary = require("cloudinary");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

let mailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "emailtestingscam@gmail.com",
    pass: "dbpdwpixluuhwuca",
  },
});

const register = async (req, res) => {
  try {
    const { name, email, password, avatar } = req.body;

    let user = await User.findOne({ email });
    if (user) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists." });
    }
    const otp = Math.floor(Math.random() * 1000000);
    const myCloud = await cloudinary.v2.uploader.upload(avatar, {
      folder: "avatars",
    });
    let details = {
      from: "emailtestingscam@gmail.com",
      to: email,
      subject: "KING-COMMUNITY :: Email Verification OTP",
      text: `Dear ${name}, Please use ${otp} to validate your Email ID. This OTP is valid for 3 minutes.`,
    };
    mailTransporter.sendMail(details);
    user = await User.create({
      name,
      email,
      password,
      avatar: { public_id: myCloud.public_id, url: myCloud.secure_url },
      otp,
      otp_expiry: new Date(Date.now() + 3 * 60 * 1000),
    });
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
    res
      .cookie("token", token, {
        httpOnly: true,
        expires: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      })
      .status(201)
      .json({
        success: true,
        message:
          "User Registered, Please verify using the OTP received on email.",
        user,
      });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const verify = async (req, res) => {
  try {
    const { otp } = Number(req.body);
    const user = await User.findById(req.user._id);
    if (user.otp === otp || user.otp_expiry > Date.now()) {
      (user.verified = true), (user.otp = null), (user.otp_expiry = null);
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid OTP or OTP expired" });
    }

    await user.save();
    res.status(200).json({ success: true, message: "Account verified", user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Enter all fields" });
    }
    let user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Register first" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Credentials" });
    }
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
    res
      .cookie("token", token, {
        httpOnly: true,
        expires: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      })
      .status(201)
      .json({ success: true, message: "Logged In", user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const logout = async (req, res) => {
  try {
    res
      .cookie("token", null, {
        httpOnly: true,
        expires: new Date(Date.now()),
      })
      .status(201)
      .json({ success: true, message: "Logged Out" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const addTask = async (req, res) => {
  try {
    const { title, description } = req.body;
    const user = await User.findById(req.user._id);
    user.tasks.push({
      title,
      description,
      completed: false,
      createdAt: new Date(Date.now()),
    });
    await user.save();
    res.status(200).json({ success: true, message: "Task added" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const removeTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const user = await User.findById(req.user._id);
    user.tasks = user.tasks.filter(
      (task) => task._id.toString() !== taskId.toString()
    );
    await user.save();
    res.status(200).json({ success: true, message: "Task removed" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const user = await User.findById(req.user._id);
    user.task = user.tasks.find(
      (task) => task._id.toString() === taskId.toString()
    );
    user.task.completed = !user.task.completed;
    await user.save();
    res.status(200).json({ success: true, message: "Task Updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res
      .status(200)
      .json({ success: true, message: `Welcome back ${user.name}`, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { name, avatar } = req.body;
    if (name) {
      user.name = name;
    }
    if (avatar) {
      await cloudinary.v2.uploader.destroy(user.avatar.public_id);

      const myCloud = await cloudinary.v2.uploader.upload(avatar, {
        folder: "avatars",
      });
      user.avatar.public_id = myCloud.public_id;
      user.avatar.url = myCloud.secure_url;
    }
    await user.save();
    res.status(200).json({ success: true, message: "Profile Updated", user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updatePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("+password");
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ success: false, message: "Enter all fields" });
    }
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Old Password" });
    }

    user.password = newPassword;

    await user.save();
    res.status(200).json({ success: true, message: "Password Updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid email" });
    }
    const otp = Math.floor(Math.random() * 1000000);
    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpiry = new Date(Date.now() + 3 * 60 * 1000);

    await user.save();

    let details = {
      from: "emailtestingscam@gmail.com",
      to: email,
      subject: "KING-COMMUNITY :: Account Password Reset",
      text: `Dear ${user.name}, Your otp for account password reset is ${otp}, This OTP is valid for only 3 minutes .`,
    };
    mailTransporter.sendMail(details);
    res.status(200).json({
      success: true,
      message: `OTP sent to ${email} for password reset`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { otp, newPassword } = req.body;
    const user = await User.findOne({
      resetPasswordOtp: otp,
      resetPasswordOtpExpiry: { $gt: Date.now() },
    }).select("+password");
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Otp Invalid or expired." });
    }
    user.password = newPassword;
    user.resetPasswordOtp = null;
    user.resetPasswordOtpExpiry = null;
    await user.save();
    res.status(200).json({ success: true, message: "Password changed" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
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
};
