const mongoose = require('mongoose');

const EmployeeProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  profilePicture: {
    type: String,
    default: 'default-profile.jpg'
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  phoneNumber: {
    type: String,
    default: ''
  },
  position: {
    type: String,
    default: ''
  },
  department: {
    type: String,
    default: ''
  },
  backgroundInfo: {
    education: String,
    previousEmployment: String,
    skills: [String]
  },
  personalInfo: {
    birthdate: Date,
    gender: String,
    civilStatus: String,
    nationality: String
  },
  socialMedia: {
    facebook: String,
    twitter: String,
    instagram: String,
    linkedin: String
  },
  parentsInfo: {
    fatherName: String,
    fatherOccupation: String,
    fatherContact: String,
    motherName: String,
    motherOccupation: String,
    motherContact: String
  },
  tinId: {
    type: String,
    default: ''
  },
  identificationCards: {
    primary: {
      type: String,
      default: ''
    },
    secondary: {
      type: String,
      default: ''
    }
  },
  dateEmployed: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const EmployeeProfile = mongoose.model('EmployeeProfile', EmployeeProfileSchema);

module.exports = EmployeeProfile;
