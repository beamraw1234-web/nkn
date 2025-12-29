'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, User, Shield, Hash, Camera, Image, Upload, X, Crop, RotateCw, Edit, Lock, Key } from 'lucide-react'
import ReactCrop, { Crop as CropType, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { data: session, update } = useSession()
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [optimisticProfileImage, setOptimisticProfileImage] = useState<string | null>(null)
  const [optimisticCoverImage, setOptimisticCoverImage] = useState<string | null>(null)
  const profileInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  // Profile editing state
  const [nicknameModal, setNicknameModal] = useState(false)
  const [passwordModal, setPasswordModal] = useState(false)
  const [newNickname, setNewNickname] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Local state for immediate UI updates
  const [localNickname, setLocalNickname] = useState<string | undefined>(undefined)
  const [forceUpdate, setForceUpdate] = useState(0)

  // Image cropping state
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [cropType, setCropType] = useState<'profile' | 'cover'>('profile')
  const [crop, setCrop] = useState<CropType>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const imgRef = useRef<HTMLImageElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)

  // Generate initials
  const initials = session?.user?.name
    ? session.user.name.slice(0, 2).toUpperCase()
    : 'US'

  const roleColor = session?.user?.role === 'ADMIN'
    ? 'bg-gradient-to-r from-purple-600 to-indigo-600'
    : 'bg-gradient-to-r from-blue-500 to-cyan-500'

  // Sync local state with session
  useEffect(() => {
    setLocalNickname(session?.user?.nickname)
  }, [session?.user?.nickname])

  // Cleanup optimistic images when session updates
  useEffect(() => {
    if (session?.user?.profilePicture && optimisticProfileImage) {
      setOptimisticProfileImage(null)
      URL.revokeObjectURL(optimisticProfileImage)
    }
    if (session?.user?.coverImage && optimisticCoverImage) {
      setOptimisticCoverImage(null)
      URL.revokeObjectURL(optimisticCoverImage)
    }
  }, [session?.user?.profilePicture, session?.user?.coverImage, optimisticProfileImage, optimisticCoverImage])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (optimisticProfileImage) {
        URL.revokeObjectURL(optimisticProfileImage)
      }
      if (optimisticCoverImage) {
        URL.revokeObjectURL(optimisticCoverImage)
      }
    }
  }, [])

  const handleImageUpload = async (file: File, type: 'profile' | 'cover') => {
    if (!file) return

    // Validate file size on client side
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      toast.error('ขนาดไฟล์ต้องน้อยกว่า 5MB')
      return
    }

    // Validate file type on client side
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('รองรับเฉพาะไฟล์รูปภาพ (JPEG, PNG, GIF, WebP)')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)

      const response = await fetch('/api/profile/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      const result = await response.json()

      if (response.ok) {
        toast.success(result.message)
        // Update session to reflect new images
        await update()
      } else {
        toast.error(result.error || 'อัปโหลดไม่สำเร็จ')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('เกิดข้อผิดพลาดในการอัปโหลด')
    } finally {
      setTimeout(() => {
        setUploading(false)
        setUploadProgress(0)
      }, 500)
    }
  }

  const handleProfileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      e.target.value = '' // Reset input
      openCropModal(file, 'profile')
    }
  }

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      e.target.value = '' // Reset input
      openCropModal(file, 'cover')
    }
  }

  const handleUpdateNickname = async () => {
    if (!newNickname.trim()) {
      toast.error('กรุณาป้อนชื่อเล่น')
      return
    }

    try {
      const response = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: newNickname.trim() }),
      })

      if (response.ok) {
        toast.success('อัปเดตชื่อเล่นสำเร็จ')

        // Update local state immediately for instant UI feedback
        const trimmedNickname = newNickname.trim() || undefined
        setLocalNickname(trimmedNickname)

        // Also update session data for persistence
        const updatedSession = {
          ...session,
          user: {
            ...session?.user,
            nickname: trimmedNickname
          }
        }
        await update(updatedSession)

        setNicknameModal(false)
        setNewNickname('')
      } else {
        const data = await response.json()
        toast.error(data.error || 'อัปเดตล้มเหลว')
      }
    } catch (error) {
      console.error('Update nickname error:', error)
      toast.error('เกิดข้อผิดพลาดในการอัปเดต')
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('รหัสผ่านใหม่ไม่ตรงกัน')
      return
    }

    if (newPassword.length < 6) {
      toast.error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
      return
    }

    try {
      const response = await fetch('/api/profile/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })

      if (response.ok) {
        toast.success('เปลี่ยนรหัสผ่านสำเร็จ')
        setPasswordModal(false)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        const data = await response.json()
        toast.error(data.error || 'เปลี่ยนรหัสผ่านล้มเหลว')
      }
    } catch (error) {
      console.error('Change password error:', error)
      toast.error('เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน')
    }
  }


  // Image cropping functions
  const openCropModal = (file: File, type: 'profile' | 'cover') => {
    const reader = new FileReader()
    reader.onload = () => {
      setSelectedImage(reader.result as string)
      setCropType(type)
      setCropModalOpen(true)

      // Set initial crop based on type
      if (type === 'profile') {
        const initialCrop = centerCrop(
          makeAspectCrop(
            { unit: '%', width: 90 },
            1, // 1:1 aspect ratio for profile
            400,
            400
          ),
          400,
          400
        )
        setCrop(initialCrop)
        // Set initial completed crop
        setCompletedCrop({
          x: initialCrop.x,
          y: initialCrop.y,
          width: initialCrop.width,
          height: initialCrop.height,
          unit: 'px'
        })
      } else {
        const initialCrop = centerCrop(
          makeAspectCrop(
            { unit: '%', width: 90 },
            16 / 9, // 16:9 aspect ratio for cover
            800,
            450
          ),
          800,
          450
        )
        setCrop(initialCrop)
        // Set initial completed crop
        setCompletedCrop({
          x: initialCrop.x,
          y: initialCrop.y,
          width: initialCrop.width,
          height: initialCrop.height,
          unit: 'px'
        })
      }
    }
    reader.readAsDataURL(file)
  }

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    let newCrop: CropType

    if (cropType === 'profile') {
      newCrop = centerCrop(
        makeAspectCrop(
          { unit: '%', width: 90 },
          1,
          width,
          height
        ),
        width,
        height
      )
    } else {
      newCrop = centerCrop(
        makeAspectCrop(
          { unit: '%', width: 90 },
          16 / 9,
          width,
          height
        ),
        width,
        height
      )
    }

    setCrop(newCrop)
    // Set completed crop for immediate use
    setCompletedCrop({
      x: newCrop.x,
      y: newCrop.y,
      width: newCrop.width,
      height: newCrop.height,
      unit: 'px'
    })
  }, [cropType])

  const getCroppedImg = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const image = imgRef.current
      const canvas = previewCanvasRef.current

      if (!image || !canvas || !completedCrop) {
        resolve(null)
        return
      }

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(null)
        return
      }

      const scaleX = image.naturalWidth / image.width
      const scaleY = image.naturalHeight / image.height

      canvas.width = completedCrop.width
      canvas.height = completedCrop.height

      ctx.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        completedCrop.width,
        completedCrop.height
      )

      canvas.toBlob((blob) => {
        resolve(blob)
      }, 'image/jpeg', 0.95)
    })
  }, [completedCrop])

  const handleCropAndUpload = async () => {
    if (!completedCrop) {
      toast.error('กรุณาปรับแต่งรูปภาพก่อนบันทึก')
      return
    }

    // Create optimistic preview URL immediately
    const croppedBlob = await getCroppedImg()
    if (!croppedBlob) {
      toast.error('ไม่สามารถครอบตัดรูปภาพได้')
      return
    }

    const previewUrl = URL.createObjectURL(croppedBlob)

    // Optimistically update UI immediately
    if (cropType === 'profile') {
      // Temporarily show the preview image
      setOptimisticProfileImage(previewUrl)
    } else {
      setOptimisticCoverImage(previewUrl)
    }

    setCropModalOpen(false)
    setUploading(true)
    setUploadProgress(0)

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 15, 90))
      }, 200)

      const croppedFile = new File([croppedBlob], `cropped-${cropType}.jpg`, { type: 'image/jpeg' })

      const formData = new FormData()
      formData.append('file', croppedFile)
      formData.append('type', cropType)

      const response = await fetch('/api/profile/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      const result = await response.json()

      if (response.ok) {
        toast.success(result.message)

        // Manually update session data since JWT strategy doesn't auto-refresh
        const updatedSession = {
          ...session,
          user: {
            ...session?.user,
            [cropType === 'profile' ? 'profilePicture' : 'coverImage']: result.path
          }
        }

        // Update the session with new data
        await update(updatedSession)

        // Clear optimistic preview immediately since we have the real path now
        if (cropType === 'profile') {
          setOptimisticProfileImage(null)
        } else {
          setOptimisticCoverImage(null)
        }
        URL.revokeObjectURL(previewUrl)
      } else {
        toast.error(result.error || 'อัปโหลดไม่สำเร็จ')
        // Clean up object URL on error
        URL.revokeObjectURL(previewUrl)
        // Revert optimistic update on error
        if (cropType === 'profile') {
          setOptimisticProfileImage(null)
        } else {
          setOptimisticCoverImage(null)
        }
      }
    } catch (error) {
      console.error('Crop and upload error:', error)
      toast.error('เกิดข้อผิดพลาดในการอัปโหลด')
      // Revert optimistic update on error
      if (cropType === 'profile') {
        setOptimisticProfileImage(null)
      } else {
        setOptimisticCoverImage(null)
      }
      URL.revokeObjectURL(previewUrl)
    } finally {
      setTimeout(() => {
        setUploading(false)
        setUploadProgress(0)
        setSelectedImage(null)
        setCrop(undefined)
        setCompletedCrop(undefined)
      }, 500)
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-8 transition-colors duration-300">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center px-4 py-2 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md text-gray-700 dark:text-gray-300 rounded-xl shadow-sm hover:bg-white dark:hover:bg-neutral-800 transition-all mb-8 group border border-gray-200 dark:border-neutral-800">
          <ArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" size={20} />
          กลับหน้าหลัก
        </Link>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          {/* Profile Header Card */}
          <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20 dark:border-neutral-800">
            {/* Cover Banner */}
            <div className={`h-32 md:h-48 ${roleColor} opacity-90 relative group`}>
              {(optimisticCoverImage || session?.user?.coverImage) ? (
                <img
                  src={optimisticCoverImage || `${session?.user?.coverImage}?t=${Date.now()}`} // Use optimistic or session image
                  alt="Cover"
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  onError={(e) => {
                    // Fallback: try alternate uploads path (strip/add 'profiles/') once, then hide
                    try {
                      const img = e.currentTarget as HTMLImageElement
                      const tried = img.dataset.triedFallback
                      const srcNoQuery = (img.src || '').split('?')[0]
                      if (!tried) {
                        let alt = ''
                        if (srcNoQuery.includes('/uploads/profiles/')) {
                          alt = srcNoQuery.replace('/uploads/profiles/', '/uploads/')
                        } else if (srcNoQuery.includes('/uploads/')) {
                          alt = srcNoQuery.replace('/uploads/', '/uploads/profiles/')
                        }
                        if (alt) {
                          img.dataset.triedFallback = '1'
                          img.src = `${alt}?t=${Date.now()}`
                          return
                        }
                      }
                    } catch (err) {
                      // ignore
                    }
                    console.error('Cover image failed to load:', optimisticCoverImage || session?.user?.coverImage)
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-30"></div>
              )}
              {/* Upload Icon in Corner */}
              <button
                onClick={() => !uploading && coverInputRef.current?.click()}
                className="absolute top-4 right-4 bg-white/90 hover:bg-white text-gray-900 p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
                disabled={uploading}
              >
                <Image size={20} />
              </button>
              {/* Upload Progress Overlay */}
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="bg-white/90 text-gray-900 px-4 py-3 rounded-lg flex flex-col items-center gap-2 min-w-32">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">กำลังอัปโหลด... {uploadProgress}%</span>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 md:px-10 pb-10">
              <div className="flex flex-col md:flex-row items-center md:items-end -mt-16 md:-mt-20 mb-8 gap-6">
                {/* Avatar */}
                <div className="relative group">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white dark:border-neutral-900 shadow-xl bg-white dark:bg-neutral-800 flex items-center justify-center shrink-0 relative z-10 overflow-hidden transition-transform group-hover:scale-105">
                    {(optimisticProfileImage || session?.user?.profilePicture) ? (
                      <img
                        key={optimisticProfileImage || session?.user?.profilePicture} // Force re-render when image changes
                        src={optimisticProfileImage || `${session?.user?.profilePicture}?t=${Date.now()}`} // Use optimistic or session image
                        alt="Profile"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback if image fails to load
                          console.error('Profile image failed to load:', optimisticProfileImage || session?.user?.profilePicture)
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <span className={`text-4xl md:text-5xl font-bold bg-clip-text text-transparent ${roleColor}`}>
                        {initials}
                      </span>
                    )}
                  </div>
                  {/* Upload Icon in Corner */}
                  <button
                    onClick={() => !uploading && profileInputRef.current?.click()}
                    className="absolute bottom-2 right-2 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-110 z-20"
                    disabled={uploading}
                  >
                    <Camera size={16} />
                  </button>
                  {/* Upload Progress Overlay */}
                  {uploading && (
                    <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                      <div className="bg-white/90 text-gray-900 px-3 py-3 rounded-lg flex flex-col items-center gap-2 min-w-24">
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium">{uploadProgress}%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Name & Role */}
                <div className="flex-1 text-center md:text-left mb-2">
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                    {session?.user?.name}
                  </h1>
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm ${roleColor}`}>
                      {session?.user?.role}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-900">
                      Active
                    </span>
                  </div>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-wrap gap-4">
                  {/* Username Card */}
                  <div className="p-5 rounded-2xl bg-gray-50/50 dark:bg-neutral-800/50 border border-gray-100 dark:border-neutral-700/50 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors group flex-1 min-w-0">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 group-hover:scale-110 transition-transform flex-shrink-0">
                        <User size={24} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">ชื่อผู้ใช้</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white truncate">{session?.user?.name}</p>
                      </div>
                    </div>
                  </div>

                  {/* Nickname Card */}
                  <div className="p-5 rounded-2xl bg-gray-50/50 dark:bg-neutral-800/50 border border-gray-100 dark:border-neutral-700/50 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors group flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="p-3 rounded-xl bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 group-hover:scale-110 transition-transform flex-shrink-0">
                          <Edit size={24} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">ชื่อเล่น</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                            {localNickname || 'ยังไม่ได้ตั้ง'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setNewNickname(localNickname || '')
                          setNicknameModal(true)
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-lg transition-colors flex-shrink-0"
                        title="แก้ไขชื่อเล่น"
                      >
                        <Edit size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  {/* Role Card */}
                  <div className="p-5 rounded-2xl bg-gray-50/50 dark:bg-neutral-800/50 border border-gray-100 dark:border-neutral-700/50 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors group flex-1 min-w-0">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 group-hover:scale-110 transition-transform flex-shrink-0">
                        <Shield size={24} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">บทบาท</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white truncate">{session?.user?.role}</p>
                      </div>
                    </div>
                  </div>

                  {/* Password Card */}
                  <div className="p-5 rounded-2xl bg-gray-50/50 dark:bg-neutral-800/50 border border-gray-100 dark:border-neutral-700/50 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors group flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="p-3 rounded-xl bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 group-hover:scale-110 transition-transform flex-shrink-0">
                          <Key size={24} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">รหัสผ่าน</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">••••••••</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setPasswordModal(true)}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-lg transition-colors flex-shrink-0"
                        title="เปลี่ยนรหัสผ่าน"
                      >
                        <Lock size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Member ID Card - Full Width */}
                <div className="p-5 rounded-2xl bg-gray-50/50 dark:bg-neutral-800/50 border border-gray-100 dark:border-neutral-700/50 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 group-hover:scale-110 transition-transform flex-shrink-0">
                      <Hash size={24} />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">รหัสสมาชิก</p>
                      <p className="text-sm md:text-base font-mono text-gray-900 dark:text-white truncate" title={session?.user?.id}>
                        {session?.user?.id}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Image Crop Modal */}
      <AnimatePresence>
        {cropModalOpen && selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setCropModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl rounded-2xl shadow-2xl p-6 max-w-2xl w-full border border-gray-100 dark:border-neutral-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Crop size={20} className="text-indigo-500" />
                  {cropType === 'profile' ? 'ปรับแต่งรูปโปรไฟล์' : 'ปรับแต่งรูปหน้าปก'}
                </h3>
                <button onClick={() => setCropModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex justify-center">
                  <ReactCrop
                    crop={crop}
                    onChange={(c) => setCrop(c)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={cropType === 'profile' ? 1 : 16 / 9}
                    className="max-w-full max-h-96"
                  >
                    <img
                      ref={imgRef}
                      src={selectedImage}
                      alt="Crop preview"
                      onLoad={onImageLoad}
                      className="max-w-full max-h-96 object-contain"
                    />
                  </ReactCrop>
                </div>

                <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                  ลากเพื่อปรับขนาดและตำแหน่งของรูปภาพ
                  {completedCrop && (
                    <div className="mt-2 text-green-600 dark:text-green-400 font-medium">
                      ✓ พร้อมบันทึก
                    </div>
                  )}
                </div>

                {/* Preview Canvas (hidden) */}
                <canvas
                  ref={previewCanvasRef}
                  className="hidden"
                />
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => setCropModalOpen(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleCropAndUpload}
                  disabled={!completedCrop || uploading}
                  className="px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed rounded-lg transition-colors shadow-lg shadow-indigo-600/20 flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      กำลังอัปโหลด...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      บันทึก
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nickname Edit Modal */}
      <AnimatePresence>
        {nicknameModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl rounded-2xl shadow-2xl p-6 max-w-md w-full border border-gray-100 dark:border-neutral-800"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Edit size={20} className="text-green-500" />
                  แก้ไขชื่อเล่น
                </h3>
                <button onClick={() => setNicknameModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ชื่อเล่น</label>
                  <input
                    type="text"
                    value={newNickname}
                    onChange={(e) => setNewNickname(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none transition-all"
                    placeholder="ป้อนชื่อเล่น..."
                    maxLength={50}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {newNickname.length}/50 ตัวอักษร
                  </p>
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => setNicknameModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleUpdateNickname}
                  className="px-6 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors shadow-lg shadow-green-600/20"
                >
                  บันทึก
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Password Change Modal */}
      <AnimatePresence>
        {passwordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl rounded-2xl shadow-2xl p-6 max-w-md w-full border border-gray-100 dark:border-neutral-800"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Key size={20} className="text-red-500" />
                  เปลี่ยนรหัสผ่าน
                </h3>
                <button onClick={() => setPasswordModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">รหัสผ่านปัจจุบัน</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
                    placeholder="ป้อนรหัสผ่านปัจจุบัน..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">รหัสผ่านใหม่</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
                    placeholder="ป้อนรหัสผ่านใหม่..."
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ยืนยันรหัสผ่านใหม่</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
                    placeholder="ป้อนรหัสผ่านใหม่อีกครั้ง..."
                    minLength={6}
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => setPasswordModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleChangePassword}
                  className="px-6 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors shadow-lg shadow-red-600/20"
                >
                  เปลี่ยนรหัสผ่าน
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden file inputs */}
      <input
        ref={profileInputRef}
        type="file"
        accept="image/*"
        onChange={handleProfileUpload}
        className="hidden"
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        onChange={handleCoverUpload}
        className="hidden"
      />

      <style jsx>{`
        .ReactCrop__crop-selection {
          border: 2px solid #3b82f6 !important;
          background-color: rgba(59, 130, 246, 0.1) !important;
        }

        .ReactCrop__drag-handle {
          background-color: #3b82f6 !important;
          border: 1px solid #ffffff !important;
          width: 12px !important;
          height: 12px !important;
        }

        .ReactCrop__drag-handle::after {
          background-color: #3b82f6 !important;
        }

        .ReactCrop__rule-of-thirds-vt,
        .ReactCrop__rule-of-thirds-hz {
          border-color: rgba(59, 130, 246, 0.3) !important;
        }
      `}</style>
    </div>
  )
}
