import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Edit, Save, X, User, Mail, Phone, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Navigation from "@/components/Navigation";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

const Profile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { 
    profile, 
    loading: profileLoading, 
    error: profileError, 
    isComplete,
    createProfile, 
    updateProfile, 
    uploadAvatar, 
    refreshProfile 
  } = useProfile();
  
  const [isEditing, setIsEditing] = useState(!profile); // Start in edit mode if no profile
  const [editData, setEditData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    bio: ""
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check for welcome message from route state
  const welcomeMessage = location.state?.message as string;

  // Initialize edit data when profile loads
  useEffect(() => {
    if (profile) {
      setEditData({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        email: profile.email || user?.email || "",
        phone: profile.phone || "",
        bio: profile.bio || ""
      });
    } else if (user && !profileLoading) {
      // Set email from user if no profile exists
      setEditData(prev => ({
        ...prev,
        email: user.email || ""
      }));
    }
  }, [profile, user, profileLoading]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors(['Please select a valid image file']);
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(['File size must be less than 5MB']);
        return;
      }

      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setErrors([]);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsSubmitting(true);
    setErrors([]);

    try {
      // Upload avatar if selected
      if (selectedFile) {
        const success = await uploadAvatar(selectedFile);
        if (!success) {
          setErrors([profileError || 'Failed to upload avatar']);
          setIsSubmitting(false);
          return;
        }
      }

      // Update or create profile
      const success = profile 
        ? await updateProfile({
            first_name: editData.first_name,
            last_name: editData.last_name,
            phone: editData.phone,
            bio: editData.bio
          })
        : await createProfile({
            first_name: editData.first_name,
            last_name: editData.last_name,
            email: editData.email,
            phone: editData.phone,
            bio: editData.bio
          });

      if (success) {
        setIsEditing(false);
        setSelectedFile(null);
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
        }
      } else {
        setErrors([profileError || 'Failed to save profile']);
      }
    } catch (err) {
      setErrors(['An unexpected error occurred']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Reset edit data to current profile data
    if (profile) {
      setEditData({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        email: profile.email || user?.email || "",
        phone: profile.phone || "",
        bio: profile.bio || ""
      });
    }
    setIsEditing(false);
    setSelectedFile(null);
    setErrors([]);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleUploadAvatar = async () => {
    if (!selectedFile) return;
    
    setIsSubmitting(true);
    const success = await uploadAvatar(selectedFile);
    
    if (success) {
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    } else {
      setErrors([profileError || 'Failed to upload avatar']);
    }
    setIsSubmitting(false);
  };

  const currentProfilePicture = previewUrl || profile?.avatar_url;

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation isLoggedIn={true} onSignOut={handleSignOut} />
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading profile...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation isLoggedIn={true} onSignOut={handleSignOut} />
      
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-secondary mb-2">Your Profile</h1>
          <p className="text-muted-foreground">Manage your account information and preferences</p>
        </div>

        {/* Welcome Message */}
        {welcomeMessage && (
          <Alert className="mb-6 border-primary/50 bg-primary/10">
            <AlertCircle className="h-4 w-4 text-primary" />
            <AlertDescription className="text-primary">
              {welcomeMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Profile Creation Message */}
        {!profile && !profileLoading && (
          <Alert className="mb-6 border-blue-500/50 bg-blue-50 dark:bg-blue-900/20">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700 dark:text-blue-300">
              Welcome to BoilerRides! Complete your profile to start connecting with other Boilermakers for safe, convenient rides.
            </AlertDescription>
          </Alert>
        )}

        {/* Error Messages */}
        {errors.length > 0 && (
          <Alert className="mb-6 border-destructive/50 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {errors.map((error, index) => (
                <div key={index}>{error}</div>
              ))}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Picture Section */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-secondary">Profile Picture</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="relative inline-block mb-4">
                <Avatar className="w-32 h-32">
                  <AvatarImage src={currentProfilePicture || undefined} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {profile?.first_name?.[0] || editData.first_name[0] || 'U'}{profile?.last_name?.[0] || editData.last_name[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                {(isEditing || !profile) && (
                  <label className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-2 rounded-full cursor-pointer hover:bg-primary/90">
                    <Camera className="h-4 w-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              {selectedFile && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedFile.name}
                  </p>
                  <Button 
                    onClick={handleUploadAvatar}
                    disabled={isSubmitting}
                    size="sm"
                    className="w-full"
                  >
                    {isSubmitting ? 'Uploading...' : 'Upload Picture'}
                  </Button>
                </div>
              )}
              {!isEditing && !selectedFile && profile && (
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditing(true)}
                  className="mt-4"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              )}
              {!profile && !isEditing && (
                <Button 
                  onClick={() => setIsEditing(true)}
                  className="mt-4 bg-gradient-primary hover:shadow-glow"
                >
                  Create Profile
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Profile Information */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-secondary">Profile Information</CardTitle>
                  {isEditing ? (
                    <div className="flex space-x-2">
                      <Button onClick={handleSave} size="sm">
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                      <Button onClick={handleCancel} variant="outline" size="sm">
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    {isEditing || !profile ? (
                      <Input
                        id="first_name"
                        name="first_name"
                        value={editData.first_name}
                        onChange={handleInputChange}
                        placeholder="Enter your first name"
                        required
                      />
                    ) : (
                      <div className="flex items-center space-x-2 p-3 bg-muted/30 rounded-md">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{profile.first_name || 'Not provided'}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    {isEditing || !profile ? (
                      <Input
                        id="last_name"
                        name="last_name"
                        value={editData.last_name}
                        onChange={handleInputChange}
                        placeholder="Enter your last name"
                        required
                      />
                    ) : (
                      <div className="flex items-center space-x-2 p-3 bg-muted/30 rounded-md">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{profile.last_name || 'Not provided'}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Purdue Email</Label>
                  {(isEditing || !profile) && !profile ? (
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={editData.email}
                      onChange={handleInputChange}
                      placeholder="your-email@purdue.edu"
                      required
                    />
                  ) : (
                    <div className="flex items-center space-x-2 p-3 bg-muted/30 rounded-md">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{profile?.email || editData.email || 'Not provided'}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  {isEditing || !profile ? (
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={editData.phone}
                      onChange={handleInputChange}
                      placeholder="+1 (555) 123-4567"
                    />
                  ) : (
                    <div className="flex items-center space-x-2 p-3 bg-muted/30 rounded-md">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{profile.phone || 'Not provided'}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  {isEditing || !profile ? (
                    <textarea
                      id="bio"
                      name="bio"
                      value={editData.bio}
                      onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                      className="w-full p-3 border border-input rounded-md bg-background min-h-[100px] resize-none"
                      placeholder="Tell other Boilermakers about yourself..."
                    />
                  ) : (
                    <div className="p-3 bg-muted/30 rounded-md">
                      <p>{profile.bio || 'No bio provided'}</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                  {isEditing || !profile ? (
                    <>
                      <Button 
                        onClick={handleSave} 
                        className="flex-1 bg-gradient-primary hover:shadow-glow"
                        disabled={isSubmitting}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {isSubmitting ? 'Saving...' : (profile ? 'Save Changes' : 'Create Profile')}
                      </Button>
                      {profile && (
                        <Button 
                          variant="outline" 
                          onClick={handleCancel}
                          disabled={isSubmitting}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button 
                      onClick={() => setIsEditing(true)} 
                      className="flex-1 bg-gradient-primary hover:shadow-glow"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Profile Stats */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-secondary">Ride Statistics</CardTitle>
            <CardDescription>Your BoilerRides activity summary</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">12</div>
                <div className="text-sm text-muted-foreground">Rides Taken</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">8</div>
                <div className="text-sm text-muted-foreground">Rides Offered</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">4.9</div>
                <div className="text-sm text-muted-foreground">Rating</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">$180</div>
                <div className="text-sm text-muted-foreground">Money Saved</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;