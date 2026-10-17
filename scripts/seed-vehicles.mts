import "dotenv/config";
import { prisma } from "../lib/prisma";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const CATALOG: { make: string; models: { name: string; yearFrom?: number; yearTo?: number }[] }[] = [
  {
    make: "Toyota",
    models: [
      { name: "Hilux", yearFrom: 2005 },
      { name: "Corolla", yearFrom: 2005 },
      { name: "Yaris", yearFrom: 2008 },
      { name: "Etios", yearFrom: 2012 },
      { name: "RAV4", yearFrom: 2006 },
      { name: "Land Cruiser", yearFrom: 2005 },
      { name: "Prado", yearFrom: 2005 },
      { name: "Camry", yearFrom: 2006 },
      { name: "Tacoma", yearFrom: 2010 },
    ],
  },
  {
    make: "Chevrolet",
    models: [
      { name: "Corsa", yearFrom: 2005, yearTo: 2016 },
      { name: "Aveo", yearFrom: 2006, yearTo: 2020 },
      { name: "Cruze", yearFrom: 2010 },
      { name: "Onix", yearFrom: 2013 },
      { name: "Tracker", yearFrom: 2013 },
      { name: "S10", yearFrom: 2005 },
      { name: "Spin", yearFrom: 2012 },
      { name: "Montana", yearFrom: 2006 },
      { name: "Camaro", yearFrom: 2010 },
    ],
  },
  {
    make: "Volkswagen",
    models: [
      { name: "Gol", yearFrom: 2005, yearTo: 2022 },
      { name: "Polo", yearFrom: 2010 },
      { name: "Voyage", yearFrom: 2008, yearTo: 2022 },
      { name: "Saveiro", yearFrom: 2005 },
      { name: "Amarok", yearFrom: 2010 },
      { name: "T-Cross", yearFrom: 2018 },
      { name: "Taos", yearFrom: 2020 },
      { name: "Fox", yearFrom: 2005, yearTo: 2020 },
    ],
  },
  {
    make: "Ford",
    models: [
      { name: "Ranger", yearFrom: 2005 },
      { name: "Focus", yearFrom: 2005, yearTo: 2018 },
      { name: "EcoSport", yearFrom: 2008, yearTo: 2022 },
      { name: "Everest", yearFrom: 2015 },
      { name: "F-150", yearFrom: 2009 },
      { name: "Ka", yearFrom: 2008, yearTo: 2020 },
      { name: "Explorer", yearFrom: 2010 },
    ],
  },
  {
    make: "Renault",
    models: [
      { name: "Logan", yearFrom: 2006 },
      { name: "Sandero", yearFrom: 2008 },
      { name: "Duster", yearFrom: 2010 },
      { name: "Clio", yearFrom: 2005, yearTo: 2019 },
      { name: "Captur", yearFrom: 2015 },
      { name: "Kangoo", yearFrom: 2007 },
      { name: "Oroch", yearFrom: 2020 },
    ],
  },
  {
    make: "Hyundai",
    models: [
      { name: "Tucson", yearFrom: 2005 },
      { name: "Elantra", yearFrom: 2006 },
      { name: "Accent", yearFrom: 2005, yearTo: 2017 },
      { name: "Creta", yearFrom: 2016 },
      { name: "H-1", yearFrom: 2007 },
      { name: "i10", yearFrom: 2014 },
      { name: "Santa Fe", yearFrom: 2006 },
      { name: "Grand i10", yearFrom: 2017 },
    ],
  },
  {
    make: "Kia",
    models: [
      { name: "Sportage", yearFrom: 2005 },
      { name: "Rio", yearFrom: 2005 },
      { name: "Cerato", yearFrom: 2008 },
      { name: "Sorento", yearFrom: 2006 },
      { name: "Picanto", yearFrom: 2007 },
      { name: "Seltos", yearFrom: 2019 },
      { name: "Carnival", yearFrom: 2014 },
    ],
  },
  {
    make: "Nissan",
    models: [
      { name: "Frontier", yearFrom: 2005 },
      { name: "Versa", yearFrom: 2007 },
      { name: "March", yearFrom: 2010 },
      { name: "Qashqai", yearFrom: 2014 },
      { name: "X-Trail", yearFrom: 2007 },
      { name: "Navara", yearFrom: 2008 },
      { name: "Sentra", yearFrom: 2013 },
    ],
  },
  {
    make: "Mitsubishi",
    models: [
      { name: "L200", yearFrom: 2006 },
      { name: "ASX", yearFrom: 2010 },
      { name: "Outlander", yearFrom: 2007 },
      { name: "Eclipse Cross", yearFrom: 2017 },
      { name: "Pajero", yearFrom: 2005, yearTo: 2021 },
      { name: "Montero Sport", yearFrom: 2015 },
    ],
  },
  {
    make: "Jeep",
    models: [
      { name: "Renegade", yearFrom: 2015 },
      { name: "Compass", yearFrom: 2011 },
      { name: "Wrangler", yearFrom: 2007 },
      { name: "Cherokee", yearFrom: 2013 },
      { name: "Gladiator", yearFrom: 2019 },
    ],
  },
  {
    make: "Suzuki",
    models: [
      { name: "Swift", yearFrom: 2005 },
      { name: "Vitara", yearFrom: 2005 },
      { name: "Jimny", yearFrom: 2007 },
      { name: "Celerio", yearFrom: 2014 },
      { name: "S-Cross", yearFrom: 2014 },
      { name: "Ertiga", yearFrom: 2018 },
    ],
  },
  {
    make: "Honda",
    models: [
      { name: "Civic", yearFrom: 2006 },
      { name: "CR-V", yearFrom: 2007 },
      { name: "HR-V", yearFrom: 2015 },
      { name: "Fit", yearFrom: 2008, yearTo: 2020 },
      { name: "Pilot", yearFrom: 2016 },
    ],
  },
  {
    make: "Chery",
    models: [
      { name: "Tiggo 2", yearFrom: 2017 },
      { name: "Tiggo 4", yearFrom: 2018 },
      { name: "Tiggo 7", yearFrom: 2018 },
      { name: "Arrizo 5", yearFrom: 2017 },
      { name: "Arrizo 3", yearFrom: 2017 },
    ],
  },
  {
    make: "Changan",
    models: [
      { name: "CS35 Plus", yearFrom: 2018 },
      { name: "CS55 Plus", yearFrom: 2019 },
      { name: "Alsvin", yearFrom: 2020 },
      { name: "CS75 Plus", yearFrom: 2019 },
    ],
  },
  {
    make: "JAC",
    models: [
      { name: "S2", yearFrom: 2017 },
      { name: "S3", yearFrom: 2016 },
      { name: "S4", yearFrom: 2019 },
      { name: "T6", yearFrom: 2017 },
    ],
  },
  {
    make: "Haval",
    models: [
      { name: "Jolion", yearFrom: 2020 },
      { name: "H6", yearFrom: 2020 },
      { name: "Dargo", yearFrom: 2021 },
    ],
  },
  {
    make: "Geely",
    models: [
      { name: "Coolray", yearFrom: 2019 },
      { name: "Emgrand", yearFrom: 2017 },
      { name: "Tugella", yearFrom: 2020 },
    ],
  },
];

async function main() {
  let makes = 0;
  let models = 0;

  for (const entry of CATALOG) {
    const makeSlug = slugify(entry.make);
    const make = await prisma.vehicleMake.upsert({
      where: { slug: makeSlug },
      update: { name: entry.make, isActive: true },
      create: { name: entry.make, slug: makeSlug, sortOrder: makes },
    });
    makes++;

    for (const m of entry.models) {
      const modelSlug = slugify(`${entry.make}-${m.name}`);
      await prisma.vehicleModel.upsert({
        where: { slug: modelSlug },
        update: { name: m.name, yearFrom: m.yearFrom ?? null, yearTo: m.yearTo ?? null, isActive: true, makeId: make.id },
        create: {
          name: m.name,
          slug: modelSlug,
          yearFrom: m.yearFrom ?? null,
          yearTo: m.yearTo ?? null,
          makeId: make.id,
        },
      });
      models++;
    }
  }

  console.log(`Vehículos listos: ${makes} marcas, ${models} modelos.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
