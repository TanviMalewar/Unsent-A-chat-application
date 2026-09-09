const mongoose= require('mongoose')
const userSchema=new mongoose.Schema({
    name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
            minlength: [3, "Name must be at least 3 characters long"],
            maxlength: [30, "Name cannot exceed 30 characters"],
        },

        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            trim: true,
            lowercase: true,
            match: [
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                "Please enter a valid email address",
            ],
        },

        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [6, "Password must contain at least 6 characters"],
            select: false,
        },

        avatar: {
            type: String,
            default: "",
        },

        bio: {
            type: String,
            default: "",
            maxlength: [150, "Bio cannot exceed 150 characters"],
        },

        isVerified: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
)

const User = mongoose.model("User", userSchema);
module.exports = User;