import "../../listing-tool.css";
import ListingFrame from "@/components/listing-tool/frame";
export const metadata = { title: "Listing Tool" };
export default function ListingLayout({ children }: { children: React.ReactNode }) {
  return <ListingFrame>{children}</ListingFrame>;
}
