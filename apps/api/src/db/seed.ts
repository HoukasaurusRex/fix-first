/**
 * Seed script: Canadian jurisdictions and consumer law summaries.
 * Run via: yarn workspace @fixfirst/api db:seed
 *
 * All summaries are plain-language educational overviews — not legal advice.
 * Uses upsert throughout so re-runs are idempotent.
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

type LawEntry = {
  statute: string;
  summary: string;
  productCategory?: string;
  effectiveDate?: Date;
};

type JurisdictionEntry = {
  code: string;
  name: string;
  isProvincial: boolean;
  laws: LawEntry[];
};

const JURISDICTIONS: JurisdictionEntry[] = [
  // -------------------------------------------------------------------------
  // Federal
  // -------------------------------------------------------------------------
  {
    code: 'CA',
    name: 'Canada (Federal)',
    isProvincial: false,
    laws: [
      {
        statute: 'Competition Act, R.S.C. 1985, c. C-34',
        summary:
          'Prohibits deceptive marketing practices and false or misleading representations about products. Requires that performance claims be based on adequate and proper testing. Warranties cannot be advertised in a way that is misleading about their scope or value.',
        effectiveDate: new Date('1985-01-01'),
      },
      {
        statute: 'Consumer Packaging and Labelling Act, R.S.C. 1985, c. C-38',
        summary:
          'Requires accurate labelling of consumer products including net quantity, product identity, and dealer information. Prevents misleading packaging that could deceive consumers about the quantity or nature of the product.',
        effectiveDate: new Date('1985-01-01'),
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Ontario
  // -------------------------------------------------------------------------
  {
    code: 'ON',
    name: 'Ontario',
    isProvincial: true,
    laws: [
      {
        statute: 'Consumer Protection Act, 2002, S.O. 2002, c. 30, Sched. A',
        summary:
          'Provides broad consumer protections including a cooling-off period for door-to-door sales, rights in internet agreements, and prohibitions on unfair practices. Implied conditions of fitness for purpose and merchantability cannot be waived for consumer goods. Consumers have remedies including repair, replacement, or refund for goods not matching representations.',
        effectiveDate: new Date('2002-01-01'),
      },
      {
        statute: 'Sale of Goods Act, R.S.O. 1990, c. S.1',
        summary:
          'Implies conditions that goods are of merchantable quality and fit for the purpose for which they are sold. These implied terms supplement any manufacturer warranty and cannot be excluded in consumer transactions.',
        effectiveDate: new Date('1990-01-01'),
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Quebec — strongest consumer protection in Canada
  // -------------------------------------------------------------------------
  {
    code: 'QC',
    name: 'Quebec',
    isProvincial: true,
    laws: [
      {
        statute: 'Loi sur la protection du consommateur, RLRQ c P-40.1 (Consumer Protection Act)',
        summary:
          'Among the strongest consumer protection laws in Canada. Provides a legal warranty (garantie légale) requiring goods to be fit for their normal use for a reasonable period beyond the merchant warranty. If a product fails within the legal warranty period, the consumer can demand repair, replacement, or refund. The merchant cannot require the consumer to deal directly with the manufacturer. Extended warranties sold separately must be registered. Amendments since 2017 strengthened rights for durable goods, including repairability requirements.',
        effectiveDate: new Date('1978-01-01'),
      },
      {
        statute: 'Civil Code of Québec, S.Q. 1991, c. 64 — Arts. 1726–1731 (warranty against latent defects)',
        summary:
          'The seller must warrant the buyer that the property and its accessories are, at the time of the sale, free of latent defects that render it unfit for the use for which it was intended, or that so diminish its usefulness that the buyer would not have bought it or paid so high a price had he been aware of them.',
        effectiveDate: new Date('1994-01-01'),
      },
    ],
  },

  // -------------------------------------------------------------------------
  // British Columbia
  // -------------------------------------------------------------------------
  {
    code: 'BC',
    name: 'British Columbia',
    isProvincial: true,
    laws: [
      {
        statute: 'Business Practices and Consumer Protection Act, S.B.C. 2004, c. 2 (BPCPA)',
        summary:
          'Prohibits deceptive and unconscionable consumer transactions. Provides implied warranties of quality, fitness for purpose, and compliance with descriptions. Allows consumers to cancel contracts and obtain refunds when goods do not conform to representations. Retailers cannot contract out of these implied warranties.',
        effectiveDate: new Date('2004-01-01'),
      },
      {
        statute: 'Sale of Goods Act, R.S.B.C. 1996, c. 410',
        summary:
          'Implies conditions that goods are of merchantable quality and reasonably fit for the purpose made known to the seller. These implied conditions apply to all consumer transactions regardless of any written warranty.',
        effectiveDate: new Date('1996-01-01'),
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Alberta
  // -------------------------------------------------------------------------
  {
    code: 'AB',
    name: 'Alberta',
    isProvincial: true,
    laws: [
      {
        statute: 'Consumer Protection Act, R.S.A. 2000, c. C-26.3',
        summary:
          'Prohibits unfair practices including false or misleading representations and unconscionable acts. Consumers may rescind a transaction involving an unfair practice. Covers internet purchases and direct selling. Implied warranties of quality and fitness cannot be excluded for consumer goods.',
        effectiveDate: new Date('2000-01-01'),
      },
      {
        statute: 'Sale of Goods Act, R.S.A. 2000, c. S-2',
        summary:
          'Implies that goods sold are of merchantable quality and fit for the buyer\'s purpose. These implied terms apply to consumer goods and supplement any manufacturer or extended warranty.',
        effectiveDate: new Date('2000-01-01'),
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Manitoba
  // -------------------------------------------------------------------------
  {
    code: 'MB',
    name: 'Manitoba',
    isProvincial: true,
    laws: [
      {
        statute: 'Consumer Protection Act, C.C.S.M. c. C200',
        summary:
          'Provides protections against unfair business practices and misleading representations. Requires that consumer goods meet implied standards of quality and fitness. Consumers have rights to repair or replacement of defective goods within a reasonable time after purchase.',
        effectiveDate: new Date('1970-01-01'),
      },
      {
        statute: 'Sale of Goods Act, C.C.S.M. c. S10',
        summary:
          'Implies conditions of merchantable quality and fitness for purpose into all consumer sales. These implied conditions cannot be waived or contracted away in consumer transactions.',
        effectiveDate: new Date('1970-01-01'),
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Saskatchewan
  // -------------------------------------------------------------------------
  {
    code: 'SK',
    name: 'Saskatchewan',
    isProvincial: true,
    laws: [
      {
        statute: 'Consumer Protection and Business Practices Act, S.S. 2014, c. C-30.2 (CPBPA)',
        summary:
          'Consolidates consumer protection in Saskatchewan. Prohibits deceptive and unconscionable consumer transactions. Implies quality and fitness warranties into consumer contracts. Provides remedies including cancellation and refunds. Covers direct sales, internet transactions, and time-share agreements.',
        effectiveDate: new Date('2014-01-01'),
      },
      {
        statute: 'Sale of Goods Act, R.S.S. 1978, c. S-1',
        summary:
          'Implies conditions that goods sold are of merchantable quality and fit for disclosed purposes. These protections apply to all consumer purchases.',
        effectiveDate: new Date('1978-01-01'),
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Nova Scotia
  // -------------------------------------------------------------------------
  {
    code: 'NS',
    name: 'Nova Scotia',
    isProvincial: true,
    laws: [
      {
        statute: 'Consumer Protection Act, R.S.N.S. 1989, c. 92',
        summary:
          'Protects consumers from unfair practices by merchants. Provides rights to receive goods as described and in a reasonably durable condition. Warranties cannot be used to limit statutory rights. Consumers may seek remedies through the courts or the Nova Scotia Consumer Protection office.',
        effectiveDate: new Date('1989-01-01'),
      },
      {
        statute: 'Sale of Goods Act, R.S.N.S. 1989, c. 408',
        summary:
          'Implies merchantability and fitness-for-purpose conditions into consumer sales contracts. These implied terms protect consumers regardless of written warranty terms.',
        effectiveDate: new Date('1989-01-01'),
      },
    ],
  },

  // -------------------------------------------------------------------------
  // New Brunswick
  // -------------------------------------------------------------------------
  {
    code: 'NB',
    name: 'New Brunswick',
    isProvincial: true,
    laws: [
      {
        statute: 'Sale of Goods Act, S.N.B. 2014, c. 27',
        summary:
          'Implies conditions of merchantable quality and fitness for purpose into all contracts for sale of goods. These implied conditions mean consumers can demand repair, replacement, or refund for defective goods, even in the absence of a written warranty.',
        effectiveDate: new Date('2014-01-01'),
      },
      {
        statute: 'Consumer Product Safety Act (federal), S.C. 2010, c. 21',
        summary:
          'Federal legislation prohibiting the manufacture, import, or sale of consumer products that pose an unreasonable danger to consumers. Requires manufacturers to report incidents involving their products.',
        effectiveDate: new Date('2010-01-01'),
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Prince Edward Island
  // -------------------------------------------------------------------------
  {
    code: 'PE',
    name: 'Prince Edward Island',
    isProvincial: true,
    laws: [
      {
        statute: 'Consumer Protection Act, R.S.P.E.I. 1988, Cap. C-19.1',
        summary:
          'Provides consumer protections against misleading and deceptive practices. Consumers have rights when goods fail to meet merchantable quality standards. The Act provides remedies including rescission of contracts for unfair practices.',
        effectiveDate: new Date('1988-01-01'),
      },
      {
        statute: 'Sale of Goods Act, R.S.P.E.I. 1988, Cap. S-1',
        summary:
          'Implies conditions that sold goods are of merchantable quality and fit for the buyer\'s stated purpose. These conditions apply to consumer transactions and cannot be excluded.',
        effectiveDate: new Date('1988-01-01'),
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Newfoundland and Labrador
  // -------------------------------------------------------------------------
  {
    code: 'NL',
    name: 'Newfoundland and Labrador',
    isProvincial: true,
    laws: [
      {
        statute: 'Consumer Protection and Business Practices Act, S.N.L. 2009, c. C-31.1 (CPBPA)',
        summary:
          'Comprehensive consumer protection covering unfair practices, direct sales, and internet transactions. Implies fitness and quality warranties into consumer contracts. Consumers can seek rescission and refunds for non-conforming goods.',
        effectiveDate: new Date('2009-01-01'),
      },
      {
        statute: 'Sale of Goods Act, R.S.N.L. 1990, c. S-6',
        summary:
          'Implies merchantable quality and fitness-for-purpose conditions into consumer sales. These implied conditions supplement any written manufacturer warranty.',
        effectiveDate: new Date('1990-01-01'),
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Northwest Territories
  // -------------------------------------------------------------------------
  {
    code: 'NT',
    name: 'Northwest Territories',
    isProvincial: true,
    laws: [
      {
        statute: 'Sale of Goods Act, R.S.N.W.T. 1988, c. S-2',
        summary:
          'Implies conditions of merchantable quality and fitness for purpose into all sales of goods. Consumers in the Northwest Territories can rely on these implied conditions when goods are defective, even without a written warranty.',
        effectiveDate: new Date('1988-01-01'),
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Nunavut
  // -------------------------------------------------------------------------
  {
    code: 'NU',
    name: 'Nunavut',
    isProvincial: true,
    laws: [
      {
        statute: 'Sale of Goods Act (as adopted from N.W.T.), R.S.N.W.T. (Nu) 1988, c. S-2',
        summary:
          'Nunavut adopted the Northwest Territories Sale of Goods Act upon its creation in 1999. Implies merchantable quality and fitness-for-purpose conditions into all consumer goods transactions. Consumers can seek repair, replacement, or refund for defective goods.',
        effectiveDate: new Date('1999-04-01'),
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Yukon
  // -------------------------------------------------------------------------
  {
    code: 'YT',
    name: 'Yukon',
    isProvincial: true,
    laws: [
      {
        statute: 'Sale of Goods Act, R.S.Y. 2002, c. 198',
        summary:
          'Implies conditions of merchantable quality and fitness for purpose into all contracts for sale of goods in Yukon. Consumers can rely on these protections regardless of the terms of any manufacturer warranty.',
        effectiveDate: new Date('2002-01-01'),
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('Seeding jurisdictions and consumer laws…');

  for (const j of JURISDICTIONS) {
    const jurisdiction = await prisma.jurisdiction.upsert({
      where: { code: j.code },
      update: { name: j.name, isProvincial: j.isProvincial },
      create: { code: j.code, name: j.name, country: 'CA', isProvincial: j.isProvincial },
    });

    for (const law of j.laws) {
      // Use statute as a natural unique key within a jurisdiction
      const existing = await prisma.jurisdictionLaw.findFirst({
        where: { jurisdictionId: jurisdiction.id, statute: law.statute },
      });

      if (existing) {
        await prisma.jurisdictionLaw.update({
          where: { id: existing.id },
          data: {
            summary: law.summary,
            productCategory: law.productCategory ?? null,
            effectiveDate: law.effectiveDate ?? null,
          },
        });
      } else {
        await prisma.jurisdictionLaw.create({
          data: {
            jurisdictionId: jurisdiction.id,
            statute: law.statute,
            summary: law.summary,
            productCategory: law.productCategory ?? null,
            effectiveDate: law.effectiveDate ?? null,
          },
        });
      }
    }

    const lawCount = j.laws.length;
    console.log(`  ${j.code}: ${j.name} — ${lawCount} law${lawCount !== 1 ? 's' : ''}`);
  }

  const totalJurisdictions = await prisma.jurisdiction.count();
  const totalLaws = await prisma.jurisdictionLaw.count();
  console.log(`\nDone. ${totalJurisdictions} jurisdictions, ${totalLaws} laws in database.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
