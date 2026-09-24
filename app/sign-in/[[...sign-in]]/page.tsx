import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="mt-5 flex justify-center">
      <SignIn path="/sign-in" />
    </div>
  );
}
