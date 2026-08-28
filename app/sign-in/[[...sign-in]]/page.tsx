import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex justify-center mt-5">
      <SignIn path="/sign-in" />
    </div>
  );
}
