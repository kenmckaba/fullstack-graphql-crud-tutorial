import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

// Create Prisma client with adapter (same as server.ts)
if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL environment variable is required");
}
const adapter = new PrismaLibSql({
	url: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
	// Clear existing data in reverse dependency order
	console.log("Clearing existing data...");
	await prisma.listItem.deleteMany();
	await prisma.listShare.deleteMany();
	await prisma.item.deleteMany();
	await prisma.shoppingList.deleteMany();
	await prisma.user.deleteMany();

	// Create sample users
	console.log("Creating sample users...");

	const user1 = await prisma.user.create({
		data: {
			name: "John Doe",
			email: "john@example.com",
		},
	});

	const user2 = await prisma.user.create({
		data: {
			name: "Jane Smith",
			email: "jane@example.com",
		},
	});

	const user3 = await prisma.user.create({
		data: {
			name: "Alice Johnson",
			email: "alice@example.com",
		},
	});

	console.log(`Created users: ${user1.name}, ${user2.name}, ${user3.name}`);

	// Create common items
	console.log("Creating common items...");

	const commonItems = [
		{ name: "Milk", category: "Dairy", createdById: user1.id },
		{ name: "Bread", category: "Bakery", createdById: user1.id },
		{ name: "Eggs", category: "Dairy", createdById: user1.id },
		{ name: "Apples", category: "Produce", createdById: user1.id },
		{ name: "Bananas", category: "Produce", createdById: user1.id },
		{ name: "Chicken Breast", category: "Meat", createdById: user1.id },
		{ name: "Rice", category: "Pantry", createdById: user2.id },
		{ name: "Olive Oil", category: "Pantry", createdById: user2.id },
		{ name: "Tomatoes", category: "Produce", createdById: user2.id },
		{ name: "Cheese", category: "Dairy", createdById: user2.id },
	];

	const createdItems = await Promise.all(
		commonItems.map((item) => prisma.item.create({ data: item })),
	);

	console.log(`Created ${createdItems.length} common items`);

	// Create shopping lists
	console.log("Creating shopping lists...");

	const groceryList = await prisma.shoppingList.create({
		data: {
			title: "Weekly Groceries",
			description: "Regular weekly grocery shopping",
			isPublic: false,
			ownerId: user1.id,
		},
	});

	const partyList = await prisma.shoppingList.create({
		data: {
			title: "Birthday Party Supplies",
			description: "Items needed for Sarah's birthday party",
			isPublic: true,
			ownerId: user1.id,
		},
	});

	const healthyList = await prisma.shoppingList.create({
		data: {
			title: "Healthy Meal Prep",
			description: "Ingredients for meal prep this week",
			isPublic: false,
			ownerId: user2.id,
		},
	});

	console.log(
		`Created shopping lists: ${groceryList.title}, ${partyList.title}, ${healthyList.title}`,
	);

	// Add items to grocery list
	console.log("Adding items to grocery list...");

	await prisma.listItem.createMany({
		data: [
			{
				listId: groceryList.id,
				itemId: createdItems[0].id,
				quantity: 2,
				notes: "2% fat",
			}, // Milk
			{
				listId: groceryList.id,
				itemId: createdItems[1].id,
				quantity: 1,
				notes: "Whole wheat",
			}, // Bread
			{
				listId: groceryList.id,
				itemId: createdItems[2].id,
				quantity: 12,
				notes: "Large eggs",
			}, // Eggs
			{
				listId: groceryList.id,
				itemId: createdItems[3].id,
				quantity: 6,
				notes: "Red apples",
			}, // Apples
			{
				listId: groceryList.id,
				itemId: createdItems[4].id,
				quantity: 3,
				notes: "Not too ripe",
			}, // Bananas
		],
	});

	// Add items to party list
	console.log("Adding items to party list...");

	// Create party-specific items
	const balloons = await prisma.item.create({
		data: {
			name: "Balloons",
			category: "Party Supplies",
			createdById: user1.id,
		},
	});

	const cake = await prisma.item.create({
		data: { name: "Birthday Cake", category: "Bakery", createdById: user1.id },
	});

	await prisma.listItem.createMany({
		data: [
			{
				listId: partyList.id,
				itemId: balloons.id,
				quantity: 20,
				notes: "Pink and gold",
			},
			{
				listId: partyList.id,
				itemId: cake.id,
				quantity: 1,
				notes: "Chocolate with strawberries",
			},
		],
	});

	// Add items to healthy list
	console.log("Adding items to healthy meal prep list...");

	await prisma.listItem.createMany({
		data: [
			{
				listId: healthyList.id,
				itemId: createdItems[5].id,
				quantity: 2,
				notes: "Organic if possible",
				isCompleted: true,
			}, // Chicken Breast
			{
				listId: healthyList.id,
				itemId: createdItems[6].id,
				quantity: 1,
				notes: "Brown rice",
			}, // Rice
			{
				listId: healthyList.id,
				itemId: createdItems[8].id,
				quantity: 4,
				notes: "Cherry tomatoes",
			}, // Tomatoes
			{
				listId: healthyList.id,
				itemId: createdItems[3].id,
				quantity: 3,
				notes: "Green apples",
			}, // Apples
		],
	});

	// Create a shared list relationship
	console.log("Creating list sharing relationship...");

	await prisma.listShare.create({
		data: {
			listId: partyList.id,
			userId: user2.id,
			permission: "edit",
		},
	});

	console.log("Database seeded successfully!");
	console.log("Sample data created:");
	console.log(`- ${3} users`);
	console.log(`- ${createdItems.length + 2} items`);
	console.log(`- ${3} shopping lists`);
	console.log(`- Multiple list items`);
	console.log(`- 1 shared list relationship`);
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
