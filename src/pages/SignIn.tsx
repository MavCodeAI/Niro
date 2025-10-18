import { SignIn as ClerkSignIn } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useUser } from "@clerk/clerk-react";

const SignIn = () => {
  const navigate = useNavigate();
  const { isSignedIn } = useUser();

  useEffect(() => {
    if (isSignedIn) {
      navigate("/");
    }
  }, [isSignedIn, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--gradient-hero)] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            Welcome to Nero AI
          </h1>
          <p className="text-muted-foreground">Sign in to start creating amazing videos</p>
        </div>
        <div className="flex justify-center">
          <ClerkSignIn 
            routing="path" 
            path="/sign-in"
            signUpUrl="/sign-up"
            afterSignInUrl="/"
          />
        </div>
      </div>
    </div>
  );
};

export default SignIn;
