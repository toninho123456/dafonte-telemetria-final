import LoginForm from "./LoginForm";
export default function Page({ searchParams }: { searchParams: { error?: string } }) {
  return <LoginForm error={searchParams.error} />;
}
