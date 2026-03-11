import User from "../models/User.js";
import Message from "../models/Message.js"
import cloudinary from "../lib/cloudinary.js";
import { io, userSocketMap } from "../lib/socket.js"
import { sanitizeText } from "../lib/sanitize.js"


//Get all users except the logged in user
export const getUsersForSiderBar = async (req, res) => {
    try {
        const userId = req.user._id;
        const filteredUsers = await User.find({ _id: { $ne: userId } }).select("-password");

        //Count number of messages not seen
        const unseenMessages = {};
        const promises = filteredUsers.map(async (user) => {
            const messages = await Message.find({ senderId: user._id, receiverId: userId, seen: false })
            if (messages.length > 0) {
                unseenMessages[user._id] = messages.length;
            }
        })

        await Promise.all(promises);
        res.json({ success: true, users: filteredUsers, unseenMessages })

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}


//Get all messeges for the selected user
export const getMessages = async (req, res) => {
    try {
        const { id: selectedUserId } = req.params;
        const myId = req.user._id;
        const messages = await Message.find({
            $or: [
                { senderId: myId, receiverId: selectedUserId },
                { senderId: selectedUserId, receiverId: myId }
            ]
        }).sort({ createdAt: 1 })

        await Message.updateMany({ senderId: selectedUserId, receiverId: myId },
            { seen: true }
        )

        res.json({ success: true, messages })
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}


//api to mark messages as seen using message id
export const markMessageAsSeen = async (req, res) => {
    try {
        const { id } = req.params;
        await Message.findByIdAndUpdate(id, { seen: true });
        res.json({ success: true });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}


//Send message to the selected user
export const sendMessage = async (req, res) => {
    try {
        const { text, image } = req.body;
        const receiverId = req.params.id;
        const senderId = req.user._id;

        // Enhanced validation
        if (!text && !image) {
            return res.json({ success: false, message: "Message content is required" });
        }

        if (text && text.trim().length === 0 && !image) {
            return res.json({ success: false, message: "Message cannot be empty" });
        }

        if (receiverId === senderId) {
            return res.json({ success: false, message: "Cannot send message to yourself" });
        }

        let imageUrl;
        if (image) {
            try {
                const uploadResponse = await cloudinary.uploader.upload(image);
                imageUrl = uploadResponse.secure_url;
            } catch (uploadError) {
                console.error('Image upload failed:', uploadError);
                return res.json({ success: false, message: "Failed to upload image" });
            }
        }

        // Create message with enhanced data
        const newMessage = await Message.create({
            senderId,
            receiverId,
            text: sanitizeText(text) || "",
            image: imageUrl,
            seen: false
        });

        // Populate sender and receiver info for better client handling
        const populatedMessage = await Message.findById(newMessage._id)
            .populate('senderId', 'fullName profilePic')
            .populate('receiverId', 'fullName profilePic');

        // Emit the new message to the receiver's socket
        const receiverSocketId = userSocketMap[receiverId];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", populatedMessage);
            console.log('Message sent to receiver:', receiverId);
        } else {
            console.log('Receiver not online, message saved to database');
        }

        // Also emit to sender for real-time update
        const senderSocketId = userSocketMap[senderId];
        if (senderSocketId && senderSocketId !== receiverSocketId) {
            io.to(senderSocketId).emit("messageSent", populatedMessage);
        }

        res.json({
            success: true,
            message: "Message sent successfully",
            newMessage: populatedMessage
        });

    } catch (error) {
        console.error('Send message error:', error.message);
        res.json({ success: false, message: "Failed to send message" });
    }
}

//Delete a message
export const deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user._id;

        const message = await Message.findById(messageId);

        if (!message) {
            return res.json({ success: false, message: "Message not found" });
        }

        // Only allow sender to delete their own messages
        if (message.senderId.toString() !== userId.toString()) {
            return res.json({ success: false, message: "Not authorized to delete this message" });
        }

        await Message.findByIdAndDelete(messageId);

        // Emit message deletion to both sender and receiver
        const receiverSocketId = userSocketMap[message.receiverId];
        const senderSocketId = userSocketMap[message.senderId];

        if (receiverSocketId) {
            io.to(receiverSocketId).emit("messageDeleted", messageId);
        }
        if (senderSocketId) {
            io.to(senderSocketId).emit("messageDeleted", messageId);
        }

        res.json({ success: true, message: "Message deleted successfully" });

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

//Search messages within a conversation
export const searchMessages = async (req, res) => {
    try {
        const { userId } = req.params;
        const { query } = req.query;
        const myId = req.user._id;

        if (!query) {
            return res.json({ success: false, message: "Search query is required" });
        }

        const messages = await Message.find({
            $or: [
                { senderId: myId, receiverId: userId },
                { senderId: userId, receiverId: myId }
            ],
            $text: { $search: query }
        }).sort({ createdAt: -1 });

        res.json({ success: true, messages });

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}