import PageHeader from '../../components/ui/PageHeader';
import PageSection from '../../components/layout/PageSection';
import EmptyState from '../../components/ui/EmptyState';

interface StudentComingSoonProps {
  title: string;
  description: string;
}

function StudentComingSoon({ title, description }: StudentComingSoonProps) {
  return (
    <div className="stack-16">
      <PageHeader title={title} subtitle="Student portal" />
      <PageSection>
        <EmptyState title="Coming soon" description={description} />
      </PageSection>
    </div>
  );
}

export default StudentComingSoon;
