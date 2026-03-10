import React from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import assets from '../assets/assets'

function ProfilePage() {
  const [selectedImage, setSelectedImage] = useState(null)
  const navigate = useNavigate();
  const [name, setName] = useState("")
  const [bio, setBio] = useState("Hi Everyone, I am using QuickChat")

  const handleSubmit = async (e) => {
    e.preventDefault();
    navigate('/')
  }

  return (
    <div className='min-h-screen bg-cover  flex items-center bg-no-repeat justify-center'>
      <div className='w-5/6 max-w-2xl backdrop-blur-2xl text-gray-300 border-2
      border-gray-600 items-center flex  justify-between max-sm:flex-col-reverse rounded-lg'>
        <form onSubmit={handleSubmit} className='p-10 flex flex-col gap-5 flex-1'>
          <h3 className='text-lg'>Profile details</h3>
          <label htmlFor="avatar" className='flex items-center gap-3 cursor-pointer'>
            <input onChange={(e)=>setSelectedImage(e.target.files[0])} type="file" id="avatar" className='hidden' accept='.png, .jpg, .jpeg, .svg'/>
            <img src={selectedImage ? URL.createObjectURL(selectedImage) : assets.avatar_icon} 
            className={`w-12 h-12 ${selectedImage && 'rounded-full'}`} alt="" />
            upload profile image
          </label>
          <input type="text" placeholder='Your name' value={name} onChange={(e) => setName(e.target.value)} 
          className='p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500' required/>

          <textarea rows={4} placeholder='Write Profile bio here...' value={bio} onChange={(e) => setBio(e.target.value)} 
          className='p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500' required/>

          <button type='submit' className='bg-violet-600 text-white py-2 rounded-md cursor-pointer'>Save</button>
        </form>
        <img className='max-w-44 aspect-square rounded-full mx-10 max-sm:mt-10' src={assets.logo_icon} alt="" />
      </div>
    </div>
  )
}

export default ProfilePage
