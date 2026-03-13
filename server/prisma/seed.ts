import { PrismaClient } from "@prisma/client";

// Create Prisma client
const prisma = new PrismaClient();

async function main() {
	// Clear existing data
	console.log("Clearing existing data...");
	await prisma.user.deleteMany();

	// Create sample users
	console.log("Creating sample users...");

	const users = [
		{ name: "John Doe", age: 30, isMarried: true },
		{ name: "Jane Smith", age: 25, isMarried: false },
		{ name: "Alice Johnson", age: 28, isMarried: false },
	];

	for (const userData of users) {
		const user = await prisma.user.create({
			data: userData,
		});
		console.log(`Created user: ${user.name} (ID: ${user.id})`);
	}

	console.log("Database seeded successfully!");
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
