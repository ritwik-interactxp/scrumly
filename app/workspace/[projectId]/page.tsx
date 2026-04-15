import WorkspacePage from "./client";

export async function generateStaticParams() {
  return [];
}

export default function Page(props: any) {
  return <WorkspacePage {...props} />;
}
