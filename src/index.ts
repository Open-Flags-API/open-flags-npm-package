
class WorkingDemo {
    greet(name: string) {
        return `Hello, ${name}! Welcome to my package.`;
    }
}

const demo = new WorkingDemo();
console.log(demo.greet('John Doe'))

export default WorkingDemo;
