import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { Employee } from "@/models/Employee";
import { UserRole } from "@/models/User";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || !session.user || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== UserRole.COMPANY_ADMIN && role !== UserRole.HR) {
      return NextResponse.json({ error: "Forbidden: HR or Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { name, phone, employeeType, department, salary, joiningDate, status, otEligible, pfEnabled, esiEnabled, shift } = body;

    await connectToDatabase();

    // Verify employee belongs to company
    const employee = await Employee.findOne({
      _id: id,
      companyId: session.user.companyId,
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found or unauthorized" }, { status: 404 });
    }

    // Check duplicate phone if phone number is updated
    if (phone && phone !== employee.phone) {
      const existingPhone = await Employee.findOne({
        companyId: session.user.companyId,
        phone,
        _id: { $ne: id },
      });
      if (existingPhone) {
        return NextResponse.json(
          { error: "Another employee with this phone number already exists." },
          { status: 409 }
        );
      }
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(
      id,
      {
        name: name ?? employee.name,
        phone: phone ?? employee.phone,
        employeeType: employeeType ?? employee.employeeType,
        department: department ?? employee.department,
        salary: salary !== undefined ? Number(salary) : employee.salary,
        joiningDate: joiningDate ? new Date(joiningDate) : employee.joiningDate,
        status: status ?? employee.status,
        otEligible: otEligible !== undefined ? !!otEligible : employee.otEligible,
        pfEnabled: pfEnabled !== undefined ? !!pfEnabled : employee.pfEnabled,
        esiEnabled: esiEnabled !== undefined ? !!esiEnabled : employee.esiEnabled,
        shift: shift ?? employee.shift,
      },
      { new: true }
    );

    return NextResponse.json({
      message: "Employee updated successfully",
      employee: updatedEmployee,
    });
  } catch (error: any) {
    console.error("Update employee error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || !session.user || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== UserRole.COMPANY_ADMIN && role !== UserRole.HR) {
      return NextResponse.json({ error: "Forbidden: HR or Admin access required" }, { status: 403 });
    }

    await connectToDatabase();

    // Verify employee belongs to company and delete
    const deletedEmployee = await Employee.findOneAndDelete({
      _id: id,
      companyId: session.user.companyId,
    });

    if (!deletedEmployee) {
      return NextResponse.json({ error: "Employee not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Employee deleted successfully",
      employee: deletedEmployee,
    });
  } catch (error: any) {
    console.error("Delete employee error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
