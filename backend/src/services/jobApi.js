import axios from 'axios';

// Adzuna API configuration
const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID || '';
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY || '';
const ADZUNA_BASE_URL = 'https://api.adzuna.com/v1/api/jobs';

// Fallback job descriptions cache
const FALLBACK_JD_CACHE = {
  'Google-Software Engineer': `Google is looking for a Software Engineer to join our team. 
Requirements: BS/MS in Computer Science or related field, 2+ years of experience in software development, 
proficiency in programming languages like Java, Python, C++, experience with data structures and algorithms, 
knowledge of distributed systems, version control (Git), and strong problem-solving skills.`,
  
  'Microsoft-Software Engineer': `Microsoft seeks a Software Engineer to develop innovative software solutions.
Requirements: Bachelor's degree in Computer Science or equivalent, 3+ years of programming experience, 
expertise in C#, .NET, Azure, and modern web technologies, strong analytical skills, 
experience with agile development methodologies, and excellent communication skills.`,
  
  'Amazon-Software Engineer': `Amazon is hiring Software Engineers to build world-class customer experiences.
Requirements: Bachelor's degree in Computer Science, 4+ years of professional software development experience, 
proficiency in Java, C++, or Python, experience with AWS services, distributed computing, 
object-oriented design, and building scalable, high-volume applications.`,
  
  'Apple-Software Engineer': `Apple is seeking Software Engineers to create amazing products.
Requirements: BS/MS in Computer Science or equivalent experience, 3+ years of software development experience, 
strong programming skills in Swift, Objective-C, C++, or Python, experience with mobile development, 
understanding of software design patterns, and passion for creating exceptional user experiences.`,
  
  'Meta-Software Engineer': `Meta (Facebook) is looking for Software Engineers to build the future of social connection.
Requirements: Bachelor's degree in Computer Science or related field, 2+ years of experience in software development, 
expertise in JavaScript, React, GraphQL, and backend technologies, experience with large-scale systems, 
mobile development (React Native), and building products that billions of people use.`,
  
  'Netflix-Software Engineer': `Netflix seeks Software Engineers to help us entertain the world.
Requirements: BS/MS in Computer Science or equivalent, 5+ years of software development experience, 
proficiency in Java, Python, JavaScript, experience with cloud platforms (AWS), microservices architecture, 
video streaming technologies, and building highly available, scalable systems.`,
  
  'Tesla-Software Engineer': `Tesla is hiring Software Engineers to accelerate the world's transition to sustainable energy.
Requirements: Bachelor's degree in Computer Science or Engineering, 3+ years of software development experience, 
strong programming skills in C++, Python, and embedded systems, experience with real-time operating systems, 
automotive software, and passion for solving complex engineering challenges.`,
  
  'IBM-Software Engineer': `IBM is looking for Software Engineers to build enterprise solutions.
Requirements: Bachelor's degree in Computer Science or related field, 2+ years of software development experience, 
proficiency in Java, Python, cloud platforms (IBM Cloud, AWS), enterprise software development, 
DevOps practices, and experience with large-scale system integration.`,
  
  'Oracle-Software Engineer': `Oracle seeks Software Engineers to develop cloud infrastructure and database solutions.
Requirements: BS/MS in Computer Science, 3+ years of software development experience, 
expertise in Java, SQL, cloud technologies, database systems, enterprise software, 
and experience with building scalable, secure enterprise applications.`,
  
  'Salesforce-Software Engineer': `Salesforce is hiring Software Engineers to build the #1 CRM platform.
Requirements: Bachelor's degree in Computer Science or equivalent, 2+ years of software development experience, 
proficiency in Java, JavaScript, Apex, experience with cloud platforms, enterprise software development, 
CRM systems, and building customer-facing enterprise applications.`,
  
  'Adobe-Software Engineer': `Adobe seeks Software Engineers to create digital experiences.
Requirements: BS/MS in Computer Science or related field, 3+ years of software development experience, 
strong programming skills in JavaScript, TypeScript, React, experience with creative software, 
cloud services, and building products for creative professionals.`,
  
  'Intel-Software Engineer': `Intel is looking for Software Engineers to drive innovation in computing.
Requirements: Bachelor's degree in Computer Science or Engineering, 2+ years of software development experience, 
proficiency in C++, Python, low-level programming, experience with system software, 
firmware development, and understanding of computer architecture.`,
  
  'NVIDIA-Software Engineer': `NVIDIA seeks Software Engineers to build the future of AI and graphics.
Requirements: BS/MS in Computer Science or Electrical Engineering, 3+ years of software development experience, 
expertise in C++, CUDA, Python, experience with GPU computing, parallel programming, 
AI/ML frameworks, and high-performance computing.`,
  
  'Spotify-Software Engineer': `Spotify is hiring Software Engineers to build the world's best audio experience.
Requirements: Bachelor's degree in Computer Science or equivalent, 2+ years of software development experience, 
proficiency in Java, Python, JavaScript, experience with music streaming technologies, 
backend systems, data processing, and building scalable consumer applications.`,
  
  'Uber-Software Engineer': `Uber is looking for Software Engineers to build mobility solutions.
Requirements: BS/MS in Computer Science or related field, 3+ years of software development experience, 
strong programming skills in Go, Python, JavaScript, experience with ride-sharing technologies, 
real-time systems, mapping services, and building global-scale applications.`
};

/**
 * Fetch job description from Adzuna API
 */
export async function fetchJobFromAdzuna(company, role) {
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
    console.warn('Adzuna API credentials not configured, using fallback JD');
    return getFallbackJD(company, role);
  }

  try {
    const searchQuery = `${role} ${company}`;
    const response = await axios.get(`${ADZUNA_BASE_URL}/us/search/1`, {
      params: {
        app_id: ADZUNA_APP_ID,
        app_key: ADZUNA_APP_KEY,
        what: searchQuery,
        results_per_page: 1,
        content_type: 'application/json'
      }
    });

    if (response.data && response.data.results && response.data.results.length > 0) {
      const job = response.data.results[0];
      return {
        title: job.title,
        company: job.company.display_name,
        description: job.description,
        location: job.location.display_name,
        salary: job.salary_min && job.salary_max ? `$${job.salary_min}-${job.salary_max}` : 'Not specified',
        url: job.redirect_url,
        source: 'adzuna'
      };
    }
  } catch (error) {
    console.error('Error fetching from Adzuna:', error.message);
  }

  return getFallbackJD(company, role);
}

/**
 * Get fallback job description from cache
 */
function getFallbackJD(company, role) {
  const key = `${company}-${role}`;
  const fallbackJD = FALLBACK_JD_CACHE[key];
  
  if (fallbackJD) {
    return {
      title: role,
      company: company,
      description: fallbackJD,
      location: 'Multiple locations',
      salary: 'Competitive',
      url: '#',
      source: 'fallback'
    };
  }

  // Generic fallback if no specific match
  return {
    title: role,
    company: company,
    description: `${company} is seeking a ${role} to join their team. 
Requirements: Bachelor's degree in Computer Science or related field, relevant work experience, 
strong programming skills, problem-solving abilities, and teamwork capabilities. 
Experience with modern technologies and best practices is preferred.`,
    location: 'Multiple locations',
    salary: 'Competitive',
    url: '#',
    source: 'fallback-generic'
  };
}

/**
 * Get list of available companies and roles
 */
export function getCompaniesAndRoles() {
  return {
    companies: [
      'Google', 'Microsoft', 'Amazon', 'Apple', 'Meta',
      'Netflix', 'Tesla', 'IBM', 'Oracle', 'Salesforce',
      'Adobe', 'Intel', 'NVIDIA', 'Spotify', 'Uber'
    ],
    roles: [
      'Software Engineer', 'Senior Software Engineer', 'Frontend Developer',
      'Backend Developer', 'Full Stack Developer', 'Data Scientist',
      'Machine Learning Engineer', 'DevOps Engineer', 'Product Manager',
      'UI/UX Designer', 'Data Analyst', 'Cloud Engineer',
      'Security Engineer', 'Mobile Developer', 'QA Engineer'
    ]
  };
}
