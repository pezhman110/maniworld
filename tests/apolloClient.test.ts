import { ApolloClient } from '../src/modules/integrationClients/apolloClient';

function mockFetch(impl: (url: string, init?: RequestInit) => Promise<Response>): typeof fetch {
  return impl as unknown as typeof fetch;
}

describe('ApolloClient', () => {
  it('returns enriched contact fields when Apollo finds a match', async () => {
    const fetchImpl = mockFetch(async () =>
      new Response(
        JSON.stringify({
          person: {
            name: 'Jane Doe',
            email: 'jane@example.com',
            phone_numbers: [{ raw_number: '+15551234567' }],
            title: 'CEO',
            organization: { name: 'Acme Inc' },
          },
        }),
        { status: 200 }
      )
    );
    const client = new ApolloClient(fetchImpl);

    const result = await client.enrichPerson({ email: 'jane@example.com' }, { apiKey: 'apollo-key' });

    expect(result).toEqual({
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+15551234567',
      title: 'CEO',
      company: 'Acme Inc',
    });
  });

  it('returns null when no person matches', async () => {
    const fetchImpl = mockFetch(async () => new Response(JSON.stringify({}), { status: 200 }));
    const client = new ApolloClient(fetchImpl);

    expect(await client.enrichPerson({ email: 'nobody@example.com' }, { apiKey: 'apollo-key' })).toBeNull();
  });

  it('throws when the Apollo API returns a non-ok status', async () => {
    const fetchImpl = mockFetch(async () => new Response('error', { status: 401 }));
    const client = new ApolloClient(fetchImpl);

    await expect(client.enrichPerson({ email: 'x@example.com' }, { apiKey: 'bad-key' })).rejects.toThrow();
  });
});
