const Service = require("./services.schema");
const Staff = require("../staff/staff.schema");
const Booking = require("../bookings/bookings.schema");
const { getPlanLimit } = require("../subscription/plan-limits.service");
const { deleteImage } = require("../uploads/cloudinary.service");
const { auditLog } = require("../utils/audit-log");
const { resolveBranchId, getScopedBranchFilter } = require("../branches/branch-access.service");

exports.listServices = async (req, res, next) => {
  try {
    const businessId = req.auth?.sub;
    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const activeQuery = req.query.active;
    const branchFilter = await getScopedBranchFilter(req, businessId, req.query.branchId);
    if (!branchFilter.ok) {
      return res.status(400).json({ message: branchFilter.message });
    }
    const query = { businessId, ...branchFilter.filter };
    if (activeQuery === "true") query.active = true;
    if (activeQuery === "false") query.active = false;

    const services = await Service.find(query).sort({ sortOrder: 1, createdAt: -1 });
    return res.status(200).json(services);
  } catch (error) {
    return next(error);
  }
};

exports.createService = async (req, res, next) => {
  try {
    const businessId = req.auth?.sub;
    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const name = String(req.body.name || "").trim();
    if (!name) {
      return res.status(400).json({ message: "Service name is required." });
    }

    const serviceLimit = await getPlanLimit(businessId, "services");
    if (Number.isFinite(serviceLimit)) {
      const count = await Service.countDocuments({ businessId });
      if (count >= serviceLimit) {
        return res.status(403).json({ message: `Your current plan allows up to ${serviceLimit} services.` });
      }
    }

    const duration = Number(req.body.duration ?? 30);
    const price = Number(req.body.price ?? 0);
    if (!Number.isFinite(duration) || duration < 0) {
      return res.status(400).json({ message: "Duration must be a non-negative number." });
    }
    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({ message: "Price must be a non-negative number." });
    }

    const requestedBranchId = ["manager", "staff"].includes(String(req.auth?.role || "").toLowerCase())
      ? req.auth?.branchId || null
      : req.body.branchId;
    const resolvedBranch = await resolveBranchId(businessId, requestedBranchId);
    if (!resolvedBranch.ok) {
      return res.status(400).json({ message: resolvedBranch.message });
    }

    const service = await Service.create({
      businessId,
      branchId: resolvedBranch.branchId ?? null,
      name,
      duration,
      price,
      active: req.body.active !== undefined ? Boolean(req.body.active) : true,
      image: req.body.image || "",
      imagePublicId: req.body.imagePublicId || "",
      description: req.body.description || "",
      sortOrder: Number(req.body.sortOrder ?? 0),
    });

    return res.status(201).json(service);
  } catch (error) {
    return next(error);
  }
};

exports.updateService = async (req, res, next) => {
  try {
    const businessId = req.auth?.sub;
    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const { serviceId } = req.params;
    if (!serviceId || !serviceId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid service id." });
    }

    const service = await Service.findOne({ _id: serviceId, businessId });
    if (!service) {
      return res.status(404).json({ message: "Service not found." });
    }
    const previousImagePublicId = service.imagePublicId || "";

    if (req.body.name !== undefined) {
      const name = String(req.body.name || "").trim();
      if (!name) return res.status(400).json({ message: "Service name cannot be empty." });
      service.name = name;
    }

    if (req.body.duration !== undefined) {
      const duration = Number(req.body.duration);
      if (!Number.isFinite(duration) || duration < 0) {
        return res.status(400).json({ message: "Duration must be a non-negative number." });
      }
      service.duration = duration;
    }

    if (req.body.price !== undefined) {
      const price = Number(req.body.price);
      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({ message: "Price must be a non-negative number." });
      }
      service.price = price;
    }

    if (req.body.active !== undefined) {
      service.active = Boolean(req.body.active);
    }

    if (req.body.branchId !== undefined) {
      const requestedBranchId = ["manager", "staff"].includes(String(req.auth?.role || "").toLowerCase())
        ? req.auth?.branchId || null
        : req.body.branchId;
      const resolvedBranch = await resolveBranchId(businessId, requestedBranchId);
      if (!resolvedBranch.ok) {
        return res.status(400).json({ message: resolvedBranch.message });
      }
      service.branchId = resolvedBranch.branchId;
    }

    if (req.body.image !== undefined) {
      service.image = String(req.body.image || "");
    }

    if (req.body.imagePublicId !== undefined) {
      service.imagePublicId = String(req.body.imagePublicId || "");
    }

    if (req.body.description !== undefined) {
      service.description = String(req.body.description || "");
    }

    if (req.body.sortOrder !== undefined) {
      const sortOrder = Number(req.body.sortOrder);
      service.sortOrder = Number.isFinite(sortOrder) ? sortOrder : 0;
    }

    await service.save();
    if (previousImagePublicId && previousImagePublicId !== service.imagePublicId) {
      await deleteImage(previousImagePublicId).catch(() => null);
    }
    return res.status(200).json(service);
  } catch (error) {
    return next(error);
  }
};

exports.deleteService = async (req, res, next) => {
  try {
    const businessId = req.auth?.sub;
    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const { serviceId } = req.params;
    if (!serviceId || !serviceId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid service id." });
    }

    const service = await Service.findOne({ _id: serviceId, businessId });
    if (!service) {
      return res.status(404).json({ message: "Service not found." });
    }

    await Service.deleteOne({ _id: service._id, businessId });
    await deleteImage(service.imagePublicId || "").catch(() => null);
    await Staff.updateMany({ businessId }, { $pull: { services: service._id } });
    await Booking.updateMany({ businessId, serviceId: service._id }, { $set: { serviceId: null } });
    auditLog("services.deleted", {
      businessId: String(businessId),
      serviceId: String(service._id),
      name: service.name,
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    return next(error);
  }
};
