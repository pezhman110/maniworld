/**
 * Apollo.io adapter.
 *
 * Optional cold-outreach/enrichment integration: given a partial contact
 * (email/phone/name), looks up richer profile data (title, company,
 * verified phone/email) from Apollo to improve lead scoring and outreach
 * targeting before the first contact attempt.
 */

export interface ApolloCredentials {
  apiKey: string;
}

export interface ApolloEnrichedContact {
  name?: string;
  email?: string;
  phone?: string;
  title?: string;
  company?: string;
}

type FetchLike = typeof fetch;

export class ApolloClient {
  constructor(private readonly fetchImpl: FetchLike = fetch) {}

  async enrichPerson(
    params: { email?: string; phone?: string; fullName?: string },
    credentials: ApolloCredentials
  ): Promise<ApolloEnrichedContact | null> {
    const response = await this.fetchImpl('https://api.apollo.io/v1/people/match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': credentials.apiKey,
      },
      body: JSON.stringify({ email: params.email, phone: params.phone, name: params.fullName }),
    });

    if (!response.ok) {
      throw new Error(`Apollo enrichment failed with status ${response.status}`);
    }

    const body = (await response.json()) as {
      person?: {
        name?: string;
        email?: string;
        phone_numbers?: { raw_number?: string }[];
        title?: string;
        organization?: { name?: string };
      };
    };

    if (!body.person) return null;

    return {
      name: body.person.name,
      email: body.person.email,
      phone: body.person.phone_numbers?.[0]?.raw_number,
      title: body.person.title,
      company: body.person.organization?.name,
    };
  }
}
