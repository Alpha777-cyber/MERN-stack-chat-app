import cloudinary from "../lib/cloudinary.js";
import { generateToken } from "../lib/utils.js";
import { sanitizeEmail, sanitizeName, sanitizeBio } from "../lib/sanitize.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs"


//Signup a new user
export const signup = async (req, res) => {
    const { fullName, email, password, bio } = req.body;
    const sanitizedEmail = sanitizeEmail(email);
    const sanitizedFullName = sanitizeName(fullName);
    const sanitizedBio = sanitizeBio(bio);
    console.log('Signup request received:', { fullName, email, password: '***', bio });

    try {
        // Enhanced validation
        if (!sanitizedFullName || !sanitizedEmail || !password) {
            console.log('Validation failed: missing details');
            return res.json({ success: false, message: "Full name, email, and password are required" })
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(sanitizedEmail)) {
            return res.json({ success: false, message: "Please enter a valid email address" })
        }

        // Validate password strength
        if (password.length < 6) {
            return res.json({ success: false, message: "Password must be at least 6 characters long" })
        }

        // Check for existing user
        const existingUser = await User.findOne({ email: sanitizedEmail });
        if (existingUser) {
            console.log('User already exists:', sanitizedEmail);
            return res.json({ success: false, message: "An account with this email already exists" })
        }

        // Hash password
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user with sanitized data
        const newUser = await User.create({
            fullName: sanitizedFullName,
            email: sanitizedEmail,
            password: hashedPassword,
            bio: sanitizedBio
        });

        // Generate token
        const token = generateToken(newUser._id);

        // Remove password from response
        const userSafe = newUser.toObject();
        delete userSafe.password;

        console.log('User created successfully:', { fullName: sanitizedFullName, email: sanitizedEmail });
        res.json({
            success: true,
            userData: userSafe,
            token,
            message: "Account created successfully"
        })
    } catch (error) {
        console.error('Signup error:', error.message);
        // Handle specific MongoDB errors
        if (error.code === 11000) {
            return res.json({ success: false, message: "An account with this email already exists" })
        }
        res.json({ success: false, message: "Failed to create account. Please try again." });
    }
}


//Controller to login a user 
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt:', { email, password: '***' });

        // Enhanced validation
        if (!email || !password) {
            return res.json({ success: false, message: "Email and password are required" });
        }

        // Normalize email
        const normalizedEmail = email.toLowerCase().trim();

        // Find user
        const userData = await User.findOne({ email: normalizedEmail });
        if (!userData) {
            console.log('User not found:', normalizedEmail);
            return res.json({ success: false, message: "Invalid email or password" });
        }

        // Check password
        const isPasswordCorrect = await bcrypt.compare(password, userData.password);
        if (!isPasswordCorrect) {
            console.log('Invalid password for:', normalizedEmail);
            return res.json({ success: false, message: "Invalid email or password" });
        }

        // Generate token
        const token = generateToken(userData._id);

        // Remove password from response
        const userSafe = userData.toObject();
        delete userSafe.password;

        console.log('Login successful:', normalizedEmail);
        res.json({
            success: true,
            userData: userSafe,
            token,
            message: "Login successful"
        })
    } catch (error) {
        console.error('Login error:', error.message);
        res.json({ success: false, message: "Login failed. Please try again." });
    }
}

//Controller to check if the user is authenticated
export const checkAuth = (req, res) => {
    res.json({ success: true, user: req.user });
}


//controller to update profile details
export const updateProfile = async (req, res) => {
    try {
        const { profilePic, bio, fullName } = req.body;
        const userId = req.user._id;

        // Sanitize inputs
        const sanitizedBio = sanitizeBio(bio);
        const sanitizedFullName = sanitizeName(fullName);

        let updatedUser;

        if (!profilePic) {
            updatedUser = await User.findByIdAndUpdate(userId, { bio: sanitizedBio, fullName: sanitizedFullName }, { new: true });
        } else {
            const upload = await cloudinary.uploader.upload(profilePic);
            updatedUser = await User.findByIdAndUpdate(userId, { bio: sanitizedBio, fullName: sanitizedFullName, profilePic: upload.secure_url }, { new: true });
        }
        res.json({ success: true, user: updatedUser });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}